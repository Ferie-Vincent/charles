<?php

namespace App\Http\Controllers;

use App\Models\DailyLog;
use App\Models\Project;
use App\Models\ProjectActivity;
use App\Services\ProjectMetricsService;
use App\Support\Roles;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user      = $request->user()->load('role');
        $companyId = $user->company_id;
        $query     = Project::query()
            ->select(['id','company_id','name','code','status','budget_amount','start_date','end_date','location','latitude','longitude'])
            ->where('company_id', $companyId);

        if (in_array($user->role->name, Roles::TERRAIN)) {
            $query->whereHas('members', fn ($q) => $q->where('user_id', $user->id));
        }

        $projects = $query->get();

        $byStatus = $projects->groupBy('status');

        $stats = [
            'active_count'    => $byStatus->get('active', collect())->count(),
            'completed_count' => $byStatus->get('completed', collect())->count(),
            'draft_count'     => $byStatus->get('en_preparation', collect())->count(),
            'budget_active'   => $byStatus->get('active', collect())->sum('budget_amount'),
            'budget_total'    => $projects->sum('budget_amount'),
        ];

        $activeProjects = $byStatus->get('active', collect())
            ->sortBy('end_date')
            ->values();

        $activitiesQuery = ProjectActivity::query()
            ->whereHas('project', fn ($q) => $q->where('company_id', $companyId))
            ->with(['user:id,name', 'project:id,code,name']);

        if (in_array($user->role->name, Roles::TERRAIN)) {
            $activitiesQuery->whereHas('project', function ($q) use ($user) {
                $q->whereHas('members', fn ($m) => $m->where('user_id', $user->id));
            });
        }

        $recentActivities = $activitiesQuery->latest()->limit(10)->get();

        [$logStats, $latestLog] = $this->fetchLogData($activeProjects);

        $metricsService = new ProjectMetricsService();
        $activeProjectsWithHealth = $activeProjects->map(
            fn (Project $p) => array_merge(
                $p->toArray(),
                ['health' => $metricsService->compute($p)]
            )
        )->values();

        $healthMap = $activeProjectsWithHealth->keyBy('id')->map(fn ($p) => $p['health']);
        $stats['health_avg']    = $activeProjectsWithHealth->isNotEmpty()
            ? (int) round($activeProjectsWithHealth->avg(fn ($p) => $p['health']['score']))
            : 0;
        $stats['health_green']  = $activeProjectsWithHealth->filter(fn ($p) => $p['health']['status'] === 'green')->count();
        $stats['health_orange'] = $activeProjectsWithHealth->filter(fn ($p) => $p['health']['status'] === 'orange')->count();
        $stats['health_red']    = $activeProjectsWithHealth->filter(fn ($p) => $p['health']['status'] === 'red')->count();
        // Weighted avg_progress: weight by budget to avoid micro-projects skewing the mean
        if ($activeProjectsWithHealth->isNotEmpty()) {
            $totalWeight  = $activeProjectsWithHealth->sum(fn ($p) => max(1, (float) ($p['budget_amount'] ?? 0)));
            $weightedSum  = $activeProjectsWithHealth->sum(
                fn ($p) => $p['health']['latest_progress'] * max(1, (float) ($p['budget_amount'] ?? 0))
            );
            $stats['avg_progress'] = (int) round($weightedSum / $totalWeight);
        } else {
            $stats['avg_progress'] = 0;
        }

        $dismissedKeys = $this->loadDismissedKeys($user->id);

        $leaderboard = $this->buildLeaderboard($activeProjects, $logStats, $latestLog);
        $alerts      = array_values(array_filter(
            $this->buildAlerts($activeProjects, $logStats, $latestLog, $healthMap, $user->role->name),
            fn ($a) => ! in_array($a['id'], $dismissedKeys, true)
        ));

        return response()->json([
            'stats'             => $stats,
            'active_projects'   => $activeProjectsWithHealth,
            'recent_activities' => $recentActivities,
            'leaderboard'       => $leaderboard,
            'alerts'            => $alerts,
        ]);
    }

    private function fetchLogData(Collection $activeProjects): array
    {
        if ($activeProjects->isEmpty()) {
            return [collect(), collect()];
        }

        $ids = $activeProjects->pluck('id');

        $logStats = DailyLog::query()
            ->selectRaw('project_id, COUNT(*) as total_logs, SUM(has_incident) as incident_count')
            ->whereIn('project_id', $ids)
            ->groupBy('project_id')
            ->get()
            ->keyBy('project_id');

        $latestLog = DailyLog::query()
            ->selectRaw('project_id, progress_percent, log_date')
            ->whereIn('project_id', $ids)
            ->whereRaw('log_date = (SELECT MAX(d2.log_date) FROM daily_logs d2 WHERE d2.project_id = daily_logs.project_id)')
            ->get()
            ->keyBy('project_id');

        return [$logStats, $latestLog];
    }

    private function buildAlerts(Collection $activeProjects, Collection $logStats, Collection $latestLog, Collection $healthMap, string $userRole = ''): array
    {
        $isTerrainRole = in_array($userRole, Roles::TERRAIN);

        $alerts = [];

        foreach ($activeProjects as $project) {
            $stats         = $logStats->get($project->id);
            $latest        = $latestLog->get($project->id);
            $totalLogs     = $stats ? (int) $stats->total_logs : 0;
            $incidentCount = $stats ? (int) $stats->incident_count : 0;
            $progress      = $latest ? (float) $latest->progress_percent : 0.0;

            // Overdue
            if ($project->end_date && $project->end_date->isPast()) {
                $days = (int) $project->end_date->diffInDays(now());
                $alerts[] = $this->alert("overdue-{$project->id}", 'overdue', 'critical', $project,
                    "Dépasse sa date de fin depuis {$days} jour" . ($days > 1 ? 's' : ''));
                continue; // overdue supersedes other alerts for this project
            }

            // No journal / stale journal
            $daysSinceStart = $project->start_date
                ? max(0, (int) $project->start_date->diffInDays(now()))
                : 0;

            if ($totalLogs === 0 && $daysSinceStart >= 7) {
                $alerts[] = $this->alert("no-journal-{$project->id}", 'no_journal', 'warning', $project,
                    "Aucun journal saisi depuis le démarrage ({$daysSinceStart}j)");
            } elseif ($latest) {
                $daysSinceLog = (int) now()->diffInDays(\Carbon\Carbon::parse($latest->log_date));
                if ($daysSinceLog >= 3) {
                    $alerts[] = $this->alert("stale-journal-{$project->id}", 'no_journal', 'warning', $project,
                        "Aucune saisie journal depuis {$daysSinceLog} jours");
                }
            }

            // Planning lag (only if not overdue)
            if ($project->start_date && $project->end_date) {
                $totalDays   = max(1, (int) $project->start_date->diffInDays($project->end_date));
                $elapsedDays = max(0, (int) $project->start_date->diffInDays(now()));
                $expectedPct = min(100, ($elapsedDays / $totalDays) * 100);
                $gap         = $expectedPct - $progress;

                if ($gap > 20) {
                    $severity = $gap > 35 ? 'critical' : 'warning';
                    $alerts[] = $this->alert("planning-lag-{$project->id}", 'planning_lag', $severity, $project,
                        sprintf('Retard planning : %.0f%% de décalage (attendu %.0f%%, réel %.0f%%)', $gap, $expectedPct, $progress));
                }
            }

            // Open incidents
            if ($incidentCount > 0) {
                $alerts[] = $this->alert("incident-{$project->id}", 'open_incident', 'warning', $project,
                    "{$incidentCount} incident" . ($incidentCount > 1 ? 's' : '') . " signalé" . ($incidentCount > 1 ? 's' : ''));
            }

            // Health score critical — strategic alert, not shown to terrain
            $health = $healthMap->get($project->id);
            if (!$isTerrainRole && $health && $health['label'] === 'critical') {
                $alerts[] = $this->alert("health-{$project->id}", 'health_critical', 'critical', $project,
                    "Score de santé critique : {$health['score']}/100");
            }
        }

        usort($alerts, fn ($a, $b) => ($a['severity'] === 'critical' ? 0 : 1) - ($b['severity'] === 'critical' ? 0 : 1));

        return $alerts;
    }

    private function alert(string $id, string $type, string $severity, Project $project, string $message): array
    {
        return [
            'id'           => $id,
            'type'         => $type,
            'severity'     => $severity,
            'project_id'   => $project->id,
            'project_name' => $project->name,
            'project_code' => $project->code,
            'message'      => $message,
            'action_url'   => "/projects/{$project->id}",
        ];
    }

    public function dismissAlert(Request $request): JsonResponse
    {
        $data = $request->validate([
            'alert_key'      => 'required|string|max:100',
            // 0 = permanent, 24/72/168 = hours; default 24
            'duration_hours' => 'nullable|integer|in:0,24,72,168',
        ]);

        $alertKey      = $data['alert_key'];
        $durationHours = $data['duration_hours'] ?? 24;
        // reappears_at = NULL means permanent suppression
        $reappearsAt   = $durationHours === 0 ? null : now()->addHours($durationHours);

        DB::table('dismissed_alerts')->upsert(
            [
                'user_id'      => $request->user()->id,
                'alert_key'    => $alertKey,
                'dismissed_at' => now(),
                'reappears_at' => $reappearsAt,
            ],
            ['user_id', 'alert_key'],
            ['dismissed_at', 'reappears_at']
        );

        return response()->json(['dismissed' => $alertKey, 'duration_hours' => $durationHours]);
    }

    private function loadDismissedKeys(int $userId): array
    {
        return DB::table('dismissed_alerts')
            ->where('user_id', $userId)
            ->where(fn($q) => $q->whereNull('reappears_at')->orWhere('reappears_at', '>', now()))
            ->pluck('alert_key')
            ->all();
    }

    private function buildLeaderboard(Collection $activeProjects, Collection $logStats, Collection $latestLog): array
    {
        if ($activeProjects->isEmpty()) return [];

        $medals = ['🥇', '🥈', '🥉'];

        return $activeProjects
            ->map(function (Project $project) use ($logStats, $latestLog) {
                $stats         = $logStats->get($project->id);
                $latest        = $latestLog->get($project->id);
                $totalLogs     = $stats ? (int) $stats->total_logs : 0;
                $incidentCount = $stats ? (int) $stats->incident_count : 0;
                $progress      = $latest ? (float) $latest->progress_percent : 0.0;

                $daysSinceStart  = $project->start_date ? max(1, (int) now()->diffInDays($project->start_date)) : 1;
                $score           = max(0.0, round(
                    $progress * 0.5 + min($totalLogs / $daysSinceStart, 1) * 30 - $incidentCount * 10,
                    1
                ));

                return ['id' => $project->id, 'name' => $project->name, 'code' => $project->code,
                        'score' => $score, 'progress' => $progress,
                        'total_logs' => $totalLogs, 'incident_count' => $incidentCount];
            })
            ->sortByDesc('score')
            ->values()
            ->take(5)
            ->map(fn ($item, $i) => array_merge($item, ['medal' => $medals[$i] ?? null]))
            ->values()
            ->toArray();
    }
}
