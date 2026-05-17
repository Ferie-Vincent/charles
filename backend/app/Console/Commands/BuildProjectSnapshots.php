<?php

namespace App\Console\Commands;

use App\Models\Project;
use App\Models\ProjectSnapshot;
use App\Models\BudgetEntry;
use App\Models\DailyLog;
use App\Models\Incident;
use App\Models\StockItem;
use App\Models\PurchaseOrder;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class BuildProjectSnapshots extends Command
{
    protected $signature = 'ai:build-snapshots {--date= : Snapshot date (YYYY-MM-DD), defaults to today}';
    protected $description = 'Build daily project_snapshots for AI context';

    public function handle(): int
    {
        $date = $this->option('date')
            ? Carbon::parse($this->option('date'))->toDateString()
            : today()->toDateString();

        $projects = Project::with(['company'])->get();

        $this->info("Building snapshots for {$date} — {$projects->count()} projects…");

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

        // Logs
        $allLogs = DailyLog::where('project_id', $pid)->orderByDesc('log_date')->get();
        $totalLogs = $allLogs->count();
        $logsLast7 = $allLogs->filter(fn($l) => Carbon::parse($l->log_date)->gte($now->copy()->subDays(7)))->count();
        $lastLog = $allLogs->first();
        $lastLogDate = $lastLog?->log_date;
        $workersToday = 0;
        if ($lastLog && Carbon::parse($lastLog->log_date)->toDateString() === $date) {
            $workersToday = $lastLog->workers_count ?? 0;
        }

        // Avg workers last 7d
        $avgWorkers = $allLogs
            ->filter(fn($l) => Carbon::parse($l->log_date)->gte($now->copy()->subDays(7)))
            ->avg('workers_count') ?? 0;

        // Top materials
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

        // Budget
        $budgetPrev = BudgetEntry::where('project_id', $pid)->where('type', 'previsionnel')->sum('amount');
        $budgetEng  = BudgetEntry::where('project_id', $pid)->where('type', 'engagement')->sum('amount');
        $budgetReal = BudgetEntry::where('project_id', $pid)->where('type', 'paiement')->sum('amount');
        $consumptionPct = $budgetPrev > 0 ? round(($budgetReal / $budgetPrev) * 100, 2) : 0;

        // Incidents
        $incidents = Incident::where('project_id', $pid)->get();
        $incidentsTotal = $incidents->count();
        $incidentsLast30 = $incidents->filter(fn($i) => Carbon::parse($i->occurred_at)->gte($now->copy()->subDays(30)))->count();
        $incidentsCritiques = $incidents->where('severity', 'critique')->count();

        // Stocks
        $stockAlerts = StockItem::where('company_id', $cid)
            ->whereColumn('quantity', '<=', 'min_quantity')
            ->count();

        // BDC pending
        $bdcPending = PurchaseOrder::where('project_id', $pid)->where('status', 'pending')->count();

        // Progress & health (from latest daily log)
        $progress = $lastLog?->progress_percent ?? 0;
        $daysTotal = $project->start_date && $project->end_date
            ? max(1, Carbon::parse($project->start_date)->diffInDays(Carbon::parse($project->end_date)))
            : null;
        $daysElapsed = $project->start_date
            ? max(0, Carbon::parse($project->start_date)->diffInDays($now, false))
            : 0;
        $theoreticalProgress = $daysTotal
            ? min(100, (int) round(($daysElapsed / $daysTotal) * 100))
            : 0;

        // Simple health score
        $planningSc = $theoreticalProgress > 0
            ? max(0, 25 - max(0, $theoreticalProgress - $progress) * 1.25)
            : 25;
        $regularitySc = $daysElapsed > 0
            ? min(1, $totalLogs / max(1, $daysElapsed)) * 25
            : 25;
        $safetySc = max(0, 25 - $incidentsCritiques * 5);
        $healthScore = (int) round($planningSc + $regularitySc + 25 + $safetySc);

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
