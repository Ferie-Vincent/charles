<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Models\ProjectActivity;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $companyId = $request->user()->company_id;

        $projects = Project::query()
            ->where('company_id', $companyId)
            ->get();

        $byStatus = $projects->groupBy('status');

        $stats = [
            'active_count'    => $byStatus->get('active', collect())->count(),
            'completed_count' => $byStatus->get('completed', collect())->count(),
            'draft_count'     => $byStatus->get('draft', collect())->count(),
            'budget_active'   => $byStatus->get('active', collect())->sum('budget_amount'),
            'budget_total'    => $projects->sum('budget_amount'),
        ];

        $activeProjects = $byStatus->get('active', collect())
            ->sortBy('end_date')
            ->values();

        $recentActivities = ProjectActivity::query()
            ->whereHas('project', fn ($q) => $q->where('company_id', $companyId))
            ->with(['user:id,name', 'project:id,code,name'])
            ->latest()
            ->limit(10)
            ->get();

        return response()->json([
            'stats'             => $stats,
            'active_projects'   => $activeProjects,
            'recent_activities' => $recentActivities,
        ]);
    }
}
