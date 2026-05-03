<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Services\HealthScoreService;
use App\Support\Roles;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PortfolioEvaluationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        abort_unless(
            in_array($request->user()->role->name, Roles::MANAGEMENT),
            403,
            'Accès réservé à la direction.'
        );

        $companyId = $request->user()->company_id;

        $projects = Project::query()
            ->where('company_id', $companyId)
            ->where('status', 'active')
            ->with(['dailyLogs'])
            ->get();

        $healthService = app(HealthScoreService::class);

        $result = $projects->map(function (Project $project) use ($healthService) {
            $health = $healthService->compute($project);

            return [
                'id'               => $project->id,
                'name'             => $project->name,
                'code'             => $project->code,
                'status'           => $project->status,
                'progress_percent' => $health['latest_progress'],
                'target_progress'  => $health['target_progress'],
                'health_score'     => $health['score'],
                'health_label'     => $health['label'],
                'planning_score'   => $health['planning_score'],
                'regularity_score' => $health['regularity_score'],
                'budget_score'     => $health['budget_score'],
                'safety_score'     => $health['safety_score'],
                'total_logs'       => $health['total_logs'],
                'incident_count'   => $health['incident_count'],
            ];
        });

        return response()->json($result->values());
    }
}
