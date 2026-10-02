<?php

namespace App\Console\Commands;

use App\Models\Project;
use App\Models\ProjectSnapshot;
use App\Models\BudgetEntry;
use App\Models\DailyLog;
use App\Models\Incident;
use App\Models\StockItem;
use App\Models\PurchaseOrder;
use App\Services\ProjectFinancialMetricsService;
use App\Services\ProjectMetricsService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class BuildProjectSnapshots extends Command
{
    protected $signature = 'ai:build-snapshots {--date= : Date du snapshot (YYYY-MM-DD), par défaut aujourd\'hui}';
    protected $description = 'Construit les project_snapshots quotidiens pour le contexte IA';

    public function handle(): int
    {
        $date = $this->option('date')
            ? Carbon::parse($this->option('date'))->toDateString()
            : today()->toDateString();

        // Relations nécessaires aux services canoniques (évite N+1 et garantit les mêmes chiffres que les écrans)
        $projects = Project::with(['company', 'dailyLogs', 'budgetEntries', 'invoices', 'dqeVersions'])->get();

        $this->info("Construction des snapshots pour {$date} — {$projects->count()} projets…");

        foreach ($projects as $project) {
            $this->buildSnapshot($project, $date);
        }

        $this->info('Done.');
        return self::SUCCESS;
    }

    private function buildSnapshot(Project $project, string $date): void
    {
        $pid = $project->id;
        $cid = $project->company_id;
        $now = Carbon::parse($date);

        // Journaux
        $allLogs = DailyLog::where('project_id', $pid)->orderByDesc('log_date')->get();
        $totalLogs = $allLogs->count();
        $logsLast7 = $allLogs->filter(fn($l) => Carbon::parse($l->log_date)->gte($now->copy()->subDays(7)))->count();
        $lastLog = $allLogs->first();
        $lastLogDate = $lastLog?->log_date;
        $workersToday = 0;
        if ($lastLog && Carbon::parse($lastLog->log_date)->toDateString() === $date) {
            $workersToday = $lastLog->workers_count ?? 0;
        }

        // Effectif moyen sur les 7 derniers jours
        $avgWorkers = $allLogs
            ->filter(fn($l) => Carbon::parse($l->log_date)->gte($now->copy()->subDays(7)))
            ->avg('workers_count') ?? 0;

        // Matériaux les plus fréquents
        $materialsFreq = [];
        foreach ($allLogs->whereNotNull('materials_received') as $log) {
            $materials = is_array($log->materials_received) ? $log->materials_received : json_decode($log->materials_received, true) ?? [];
            foreach ($materials as $m) {
                $name = $m['name'] ?? ($m['material'] ?? null);
                if ($name) {
                    $materialsFreq[$name] = ($materialsFreq[$name] ?? 0) + 1;
                }
            }
        }
        arsort($materialsFreq);
        $topMaterials = array_keys(array_slice($materialsFreq, 0, 5, true));

        // Budget — SOURCE CANONIQUE (mêmes chiffres que BudgetController / ProjectAccountingController).
        // Avant : somme brute de budget_entries.paiement → divergeait du « réalisé » affiché (factures payées).
        $fin         = app(ProjectFinancialMetricsService::class)->compute($project);
        $budgetPrev  = $fin['budget_ref'];
        $budgetEng   = $fin['engage'];
        $budgetReal  = $fin['realise'];
        $consumptionPct = $budgetPrev > 0 ? round(($budgetReal / $budgetPrev) * 100, 2) : 0;

        // Incidents sur le projet
        $incidents = Incident::where('project_id', $pid)->get();
        $incidentsTotal = $incidents->count();
        $incidentsLast30 = $incidents->filter(fn($i) => Carbon::parse($i->occurred_at)->gte($now->copy()->subDays(30)))->count();
        $incidentsCritiques = $incidents->where('severity', 'critique')->count();

        // Alertes de stock
        $stockAlerts = StockItem::where('company_id', $cid)
            ->whereColumn('quantity', '<=', 'threshold')
            ->count();

        // BDC en attente
        $bdcPending = PurchaseOrder::where('project_id', $pid)->where('status', 'pending')->count();

        // Avancement & health score (depuis le dernier journal)
        // Même résolution que le Health Score (certifié > déclaré)
        $progress = (int) round(app(\App\Services\ProjectProgressResolver::class)->resolve($project)['value']);
        $daysTotal = $project->start_date && $project->end_date
            ? max(1, Carbon::parse($project->start_date)->diffInDays(Carbon::parse($project->end_date)))
            : null;
        $daysElapsed = $project->start_date
            ? max(0, Carbon::parse($project->start_date)->diffInDays($now, false))
            : 0;
        $theoreticalProgress = $daysTotal
            ? min(100, (int) round(($daysElapsed / $daysTotal) * 100))
            : 0;

        // Health score — même service que l'écran (plus de « + 25 » budget codé en dur ici).
        $healthScore = app(ProjectMetricsService::class)->compute($project)['score'];

        ProjectSnapshot::updateOrCreate(
            ['project_id' => $pid, 'snapshot_date' => $date],
            [
                'company_id'               => $cid,
                'progress_percent'         => $progress,
                'theoretical_progress'     => $theoreticalProgress,
                'health_score'             => min(100, $healthScore),
                'total_logs'               => $totalLogs,
                'logs_last_7_days'         => $logsLast7,
                'last_log_date'            => $lastLogDate,
                'workers_today'            => $workersToday,
                'avg_workers_7d'           => round($avgWorkers, 1),
                'budget_previsionnel'      => $budgetPrev,
                'budget_engage'            => $budgetEng,
                'budget_realise'           => $budgetReal,
                'budget_consumption_pct'   => $consumptionPct,
                'incidents_total'          => $incidentsTotal,
                'incidents_last_30d'       => $incidentsLast30,
                'incidents_critiques'      => $incidentsCritiques,
                'stock_alerts'             => $stockAlerts,
                'bdc_pending'              => $bdcPending,
                'invoices_pending'         => 0,
                'invoices_pending_amount'  => 0,
                'last_weather'             => $lastLog?->weather,
                'top_materials'            => $topMaterials,
                'project_name'             => $project->name,
                'project_start'            => $project->start_date,
                'project_end'              => $project->end_date,
                'project_status'           => $project->status,
                'project_budget'           => $project->budget_amount ?? $budgetPrev,
            ]
        );
    }
}
