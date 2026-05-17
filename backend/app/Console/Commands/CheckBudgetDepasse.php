<?php

namespace App\Console\Commands;

use App\Models\Project;
use App\Models\User;
use App\Notifications\BudgetDepaseNotification;
use App\Services\ProjectFinancialMetricsService;
use App\Support\Roles;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

#[Signature('projects:check-budget-depasse {--dry-run : List without sending}')]
#[Description('Alerte CDT + direction quand le coût réalisé dépasse budget_ref de > 5%')]
class CheckBudgetDepasse extends Command
{
    public function __construct(private ProjectFinancialMetricsService $metricsService)
    {
        parent::__construct();
    }

    public function handle(): int
    {
        // Anti-doublon 7 jours : ignorer les projets déjà notifiés cette semaine
        $recentProjectIds = DB::table('notifications')
            ->where('created_at', '>', now()->subDays(7))
            ->get(['data'])
            ->map(fn($n) => json_decode($n->data, true))
            ->filter(fn($d) => ($d['type'] ?? '') === 'budget_depasse' && isset($d['project_id']))
            ->pluck('project_id')
            ->unique()
            ->map(fn($id) => (int) $id)
            ->values()
            ->toArray();

        $projects = Project::where('status', 'active')
            ->whereNotIn('id', $recentProjectIds)
            ->with(['budgetEntries', 'invoices', 'dqeVersions.lines'])
            ->get();

        $alerted = 0;

        foreach ($projects as $project) {
            $metrics   = $this->metricsService->compute($project);
            $budgetRef = $metrics['budget_ref'];
            $realise   = $metrics['realise'];

            if ($budgetRef <= 0 || $realise <= $budgetRef * 1.05) {
                continue;
            }

            $depassementPct = round(($realise - $budgetRef) / $budgetRef * 100, 1);
            $this->line("  {$project->code} — réalisé " . number_format($realise, 0, ',', ' ') . " / ref " . number_format($budgetRef, 0, ',', ' ') . " (+{$depassementPct}%)");
            $alerted++;

            if ($this->option('dry-run')) {
                continue;
            }

            User::whereHas('role', fn($q) => $q->whereIn('name', [
                Roles::CONDUCTEUR_TRAVAUX_SLUG,
                Roles::DIRECTEUR_TECHNIQUE_SLUG,
                Roles::DIRECTION_SLUG,
            ]))
                ->where('company_id', $project->company_id)
                ->get()
                ->each(fn($u) => $u->notify(
                    new BudgetDepaseNotification($project, $realise, $budgetRef, $depassementPct)
                ));
        }

        $this->info("Terminé. {$alerted} projet(s) en dépassement de budget.");
        return Command::SUCCESS;
    }
}
