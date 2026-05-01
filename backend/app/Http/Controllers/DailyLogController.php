<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreDailyLogRequest;
use App\Models\DailyLog;
use App\Models\Project;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\ValidationException;

class DailyLogController extends Controller
{
    public function index(Project $project): JsonResponse
    {
        $this->authorize('viewAny', [DailyLog::class, $project]);

        $logs = DailyLog::where('project_id', $project->id)
            ->orderBy('log_date', 'desc')
            ->get();

        $meta = DailyLog::where('project_id', $project->id)
            ->selectRaw('
                COUNT(*) as total_logs,
                MAX(progress_percent) as latest_progress,
                SUM(has_incident) as incident_count,
                AVG(workers_count) as avg_workers
            ')
            ->first();

        $latestLog = $logs->first();

        return response()->json([
            'data' => $logs,
            'meta' => [
                'total_logs'      => (int) $meta->total_logs,
                'latest_progress' => $latestLog ? (float) $latestLog->progress_percent : null,
                'incident_count'  => (int) $meta->incident_count,
                'avg_workers'     => $meta->total_logs > 0 ? round((float) $meta->avg_workers, 1) : null,
            ],
        ]);
    }

    public function store(StoreDailyLogRequest $request, Project $project): JsonResponse
    {
        $this->authorize('create', [DailyLog::class, $project]);

        $today = now()->toDateString();

        if (DailyLog::where('project_id', $project->id)->where('log_date', $today)->exists()) {
            throw ValidationException::withMessages([
                'log_date' => ['Un journal existe déjà pour ce projet aujourd\'hui.'],
            ]);
        }

        $log = DailyLog::create([
            ...$request->validated(),
            'project_id' => $project->id,
            'user_id' => $request->user()->id,
            'log_date' => $today,
        ]);

        return response()->json(['data' => $log], 201);
    }
}
