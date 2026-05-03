<?php

namespace App\Services;

use App\Models\Project;

/**
 * Backward-compatible wrapper autour de ProjectMetricsService.
 * Les anciens callers (controllers, tests) continuent à fonctionner sans modification.
 */
class HealthScoreService
{
    public function compute(Project $project): array
    {
        return (new ProjectMetricsService())->compute($project);
    }
}
