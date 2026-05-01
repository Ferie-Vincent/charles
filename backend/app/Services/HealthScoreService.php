<?php

namespace App\Services;

use App\Models\Project;
use Carbon\Carbon;

class HealthScoreService
{
    public function compute(Project $project): array
    {
        $logs      = $project->dailyLogs()->get();
        $totalLogs = $logs->count();

        $latestProgress = $logs->sortByDesc('log_date')->first()?->progress_percent ?? 0;
        $incidentCount  = $logs->where('has_incident', true)->count();

        $daysSinceStart = $project->start_date
            ? max(1, (int) Carbon::parse($project->start_date)->diffInDays(Carbon::today()))
            : 1;

        $target = $project->target_progress ?? 100;

        $planningScore   = $latestProgress >= $target
            ? 25
            : max(0, 25 - ($target - $latestProgress) * 1.25);

        $regularityScore = min($totalLogs / max(1, $daysSinceStart), 1) * 25;

        $budgetScore  = 25;

        $safetyScore  = max(0, 25 - $incidentCount * 5);

        $total = (int) round($planningScore + $regularityScore + $budgetScore + $safetyScore);

        return [
            'score'            => $total,
            'label'            => $this->label($total),
            'planning_score'   => (int) round($planningScore),
            'regularity_score' => (int) round($regularityScore),
            'budget_score'     => (int) $budgetScore,
            'safety_score'     => (int) round($safetyScore),
            'latest_progress'  => $latestProgress,
            'target_progress'  => $target,
            'total_logs'       => $totalLogs,
            'incident_count'   => $incidentCount,
        ];
    }

    private function label(int $score): string
    {
        if ($score >= 75) return 'good';
        if ($score >= 50) return 'warning';
        return 'critical';
    }
}
