<?php

namespace App\Services;

use App\Models\Project;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Collection;

class ProjectMetricsService
{
    /**
     * Calcule toutes les métriques d'un projet.
     *
     * @return array{
     *   score: int,
     *   label: string,
     *   planning_score: int,
     *   regularity_score: int,
     *   budget_score: int,
     *   safety_score: int,
     *   realise: float,
     *   engage: float,
     *   previsionnel: float,
     *   ecart: float,
     *   latest_progress: int,
     *   target_progress: int,
     *   total_logs: int,
     *   incident_count: int
     * }
     */
    public function compute(Project $project): array
    {
        // --- Daily logs — use already-loaded relation to avoid N+1 ---
        $logs = $project->relationLoaded('dailyLogs')
            ? $project->dailyLogs
            : $project->dailyLogs()->get();

        $totalLogs      = $logs->count();
        $latestProgress = (int) ($logs->sortByDesc('log_date')->first()?->progress_percent ?? 0);
        $incidentCount  = $logs->where('has_incident', true)->count();

        // --- Temporal ---
        $daysSinceStart = $project->start_date
            ? max(1, (int) Carbon::parse($project->start_date)->diffInDays(Carbon::today()))
            : 1;

        $target = $project->target_progress ?? 100;

        // --- Planning score (max 25) ---
        // Grace period: projects < 30 days can't be penalized — target_progress defaults to 100
        // and early-stage progress will always appear behind, producing unfair score of 0.
        $planningScore = $daysSinceStart <= 30
            ? 25.0
            : ($latestProgress >= $target
                ? 25
                : max(0, 25 - ($target - $latestProgress) * 1.25));

        // --- Regularity score (max 25) — 7-day grace to avoid perfect J+1 score ---
        $regularityScore = $daysSinceStart <= 7
            ? 25.0
            : min($totalLogs / $daysSinceStart, 1) * 25;

        // --- Safety score (max 25) ---
        $safetyScore = max(0, 25 - $incidentCount * 5);

        // --- Budget score (max 25, corrigé — plus de placeholder fixe) ---
        [$budgetScore, $realise, $engage, $previsionnel] = $this->computeBudgetScore($project);

        $ecart = $previsionnel - $realise - $engage; // budget_ref − réalisé − engagé = disponible

        // --- Total ---
        $total = (int) round($planningScore + $regularityScore + $budgetScore + $safetyScore);

        return [
            'score'            => $total,
            'status'           => $this->status($total),
            'label'            => $this->label($total),
            'planning_score'   => (int) round($planningScore),
            'regularity_score' => (int) round($regularityScore),
            'budget_score'     => (int) round($budgetScore),
            'safety_score'     => (int) round($safetyScore),
            'realise'          => round($realise, 2),   // factures payées uniquement
            'engage'           => round($engage, 2),    // factures validées + payées (engagements fermes)
            'previsionnel'     => round($previsionnel, 2),
            'ecart'            => round($ecart, 2),
            'latest_progress'  => $latestProgress,
            'target_progress'  => $target,
            'total_logs'       => $totalLogs,
            'incident_count'   => $incidentCount,
        ];
    }

    /**
     * Calcule les métriques pour une collection de projets.
     *
     * @param  Collection<int, Project>  $projects
     * @return Collection<int, array>
     */
    public function computeMultiple(Collection $projects): Collection
    {
        return $projects->map(fn (Project $project) => $this->compute($project));
    }

    // -------------------------------------------------------------------------
    // Internals
    // -------------------------------------------------------------------------

    /**
     * Calcule le budget_score, le réalisé, l'engagé et le prévisionnel.
     *
     * @return array{0: float, 1: float, 2: float, 3: float}  [budget_score, realise, engage, previsionnel]
     */
    private function computeBudgetScore(Project $project): array
    {
        // Référence budgétaire : DQE validé > budget_amount du projet.
        $dqeVersions = $project->relationLoaded('dqeVersions')
            ? $project->dqeVersions
            : $project->dqeVersions()->get();

        $validatedDqe = $dqeVersions
            ->where('status', 'validated')
            ->sortByDesc('version_number')
            ->first();

        $budgetRef = $validatedDqe
            ? (float) $validatedDqe->total_ht
            : (float) ($project->budget_amount ?? 0);

        $invoices = $project->relationLoaded('invoices')
            ? $project->invoices
            : $project->invoices()->get();

        $budgetEntries = $project->relationLoaded('budgetEntries')
            ? $project->budgetEntries
            : $project->budgetEntries()->get();

        // Réalisé = factures payées uniquement (décaissé).
        $realise = (float) $invoices->where('status', 'payee')->sum('amount_ht');

        // Engagé = BDC entries + factures validées (engagement ferme total, source canonique).
        $engagement = (float) $budgetEntries->where('type', 'engagement')->sum('amount');
        $engage     = $engagement + (float) $invoices->where('status', 'validee')->sum('amount_ht');

        // Pas de référence budgétaire → score neutre.
        if ($budgetRef <= 0) {
            return [15.0, $realise, $engage, 0.0];
        }

        // Score basé sur l'engagé (plus prudent que le seul réalisé).
        $ratio = $engage / $budgetRef;

        $score = match (true) {
            $ratio <= 0.5  => 25.0,
            $ratio <= 0.9  => 20.0,
            $ratio <= 1.0  => 15.0,
            $ratio <= 1.1  => 8.0,
            default        => 0.0,
        };

        return [$score, $realise, $engage, $budgetRef];
    }

    private function status(int $score): string
    {
        if ($score >= 75) return 'green';
        if ($score >= 50) return 'orange';
        return 'red';
    }

    private function label(int $score): string
    {
        if ($score >= 75) {
            return 'good';
        }
        if ($score >= 50) {
            return 'warning';
        }

        return 'critical';
    }
}
