<?php

namespace App\Http\Controllers;

use App\Events\DailyLogCreated;
use App\Http\Requests\StoreDailyLogRequest;
use App\Models\DailyLog;
use App\Models\Project;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
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
                SUM(has_incident) as incident_count,
                AVG(workers_count) as avg_workers
            ')
            ->first();

        // FIX M13: latest_progress = most recent log's progress (chronological), not MAX
        $latestLog = $project->dailyLogs()->orderByDesc('log_date')->first();
        $latestProgress = $latestLog ? (float) $latestLog->progress_percent : null;

        return response()->json([
            'data' => $logs,
            'meta' => [
                'total_logs'      => (int) $meta->total_logs,
                'latest_progress' => $latestProgress,
                'incident_count'  => (int) $meta->incident_count,
                'avg_workers'     => $meta->total_logs > 0 ? round((float) $meta->avg_workers, 1) : null,
            ],
        ]);
    }

    public function store(StoreDailyLogRequest $request, Project $project): JsonResponse
    {
        $this->authorize('create', [DailyLog::class, $project]);

        // Guard: journal autorisé en exécution et en réception (levée de réserves)
        if (!in_array($project->lifecycle_status, ['execution', 'reception'])) {
            return response()->json([
                'message' => "Journal non autorisé — le chantier est en phase « {$project->lifecycle_status} ». Un OS de démarrage doit être émis avant toute saisie.",
            ], 422);
        }

        $today = now()->toDateString();

        if (DailyLog::where('project_id', $project->id)->where('log_date', $today)->exists()) {
            throw ValidationException::withMessages([
                'log_date' => ['Un journal existe déjà pour ce projet aujourd\'hui.'],
            ]);
        }

        $data = $request->validated();

        // FIX M8: log progress regression (do NOT block — legitimate corrections exist)
        if (isset($data['progress_percent'])) {
            $maxProgress = $project->dailyLogs()
                ->where('log_date', '<', $today)
                ->max('progress_percent');
            if ($maxProgress !== null && $data['progress_percent'] < $maxProgress) {
                \Log::warning("Progress regression on project {$project->id}: {$maxProgress}% → {$data['progress_percent']}%");
            }
        }

        $log = DailyLog::create([
            ...$data,
            'project_id' => $project->id,
            'user_id'    => $request->user()->id,
            'log_date'   => $today,
        ]);

        event(new DailyLogCreated($log, $project));

        $warning = $project->is_arrete
            ? "Chantier déclaré en arrêt depuis le {$project->arret_depuis} — ce journal est saisi pendant la période d'arrêt."
            : null;

        return response()->json(['data' => $log, 'arret_warning' => $warning], 201);
    }

    public function update(Request $request, Project $project, DailyLog $dailyLog): JsonResponse
    {
        $this->authorize('update', [$dailyLog, $project]);
        abort_if($dailyLog->project_id !== $project->id, 404);

        $data = $request->validate([
            'weather'            => 'sometimes|string|max:50',
            'workers_count'      => 'sometimes|integer|min:0',
            'progress_percent'   => 'sometimes|integer|min:0|max:100',
            'has_incident'       => 'sometimes|boolean',
            'incident_type'      => 'nullable|string|max:100',
            'equipment_status'   => 'nullable|string|max:50',
            'materials_received' => 'nullable|array',
            'notes'              => 'nullable|string|max:2000',
        ]);

        $dailyLog->update($data);

        return response()->json($dailyLog);
    }

    public function destroy(Project $project, DailyLog $dailyLog): Response
    {
        $this->authorize('delete', [$dailyLog, $project]);
        abort_if($dailyLog->project_id !== $project->id, 404);
        $dailyLog->delete();

        return response()->noContent();
    }
}
