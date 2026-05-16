<?php

namespace App\Http\Controllers;

use App\Models\DailyAttendance;
use App\Models\Project;
use App\Models\ProjectWorker;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProjectWorkerController extends Controller
{
    /** GET /api/projects/{project}/workers */
    public function index(Request $request, Project $project): JsonResponse
    {
        $this->authorize('viewAny', [ProjectWorker::class, $project]);

        $date = $request->query('date', now()->toDateString());

        $workers = ProjectWorker::where('project_id', $project->id)
            ->where('company_id', $request->user()->company_id)
            ->orderBy('name')
            ->get();

        $attendances = DailyAttendance::where('project_id', $project->id)
            ->where('log_date', $date)
            ->get()
            ->keyBy('worker_id');

        $result = $workers->map(function (ProjectWorker $w) use ($attendances) {
            $att = $attendances->get($w->id);
            return [
                'id'            => $w->id,
                'name'          => $w->name,
                'trade'         => $w->trade,
                'phone'         => $w->phone,
                'is_active'     => $w->is_active,
                'attendance'    => $att ? [
                    'id'           => $att->id,
                    'present'      => $att->present,
                    'task_assigned'=> $att->task_assigned,
                ] : null,
            ];
        });

        return response()->json(['workers' => $result]);
    }

    /** POST /api/projects/{project}/workers */
    public function store(Request $request, Project $project): JsonResponse
    {
        $this->authorize('create', [ProjectWorker::class, $project]);

        $data = $request->validate([
            'name'  => 'required|string|max:120',
            'trade' => 'required|string|max:80',
            'phone' => 'nullable|string|max:30',
        ]);

        $worker = ProjectWorker::create([
            ...$data,
            'project_id' => $project->id,
            'company_id' => $request->user()->company_id,
        ]);

        return response()->json(['worker' => $worker], 201);
    }

    /** PATCH /api/projects/{project}/workers/{worker} */
    public function update(Request $request, Project $project, ProjectWorker $worker): JsonResponse
    {
        $this->authorize('update', $worker);

        $data = $request->validate([
            'name'      => 'sometimes|string|max:120',
            'trade'     => 'sometimes|string|max:80',
            'phone'     => 'nullable|string|max:30',
            'is_active' => 'sometimes|boolean',
        ]);

        $worker->update($data);

        return response()->json(['worker' => $worker]);
    }

    /** DELETE /api/projects/{project}/workers/{worker} */
    public function destroy(Request $request, Project $project, ProjectWorker $worker): JsonResponse
    {
        $this->authorize('delete', $worker);

        $worker->delete();

        return response()->json(null, 204);
    }

    /** POST /api/projects/{project}/workers/attendance */
    public function attendance(Request $request, Project $project): JsonResponse
    {
        $this->authorize('create', [ProjectWorker::class, $project]);

        $data = $request->validate([
            'worker_id'     => 'required|integer|exists:project_workers,id',
            'log_date'      => 'required|date_format:Y-m-d',
            'present'       => 'required|boolean',
            'task_assigned' => 'nullable|string|max:120',
        ]);

        $att = DailyAttendance::updateOrCreate(
            ['worker_id' => $data['worker_id'], 'log_date' => $data['log_date']],
            [
                'project_id'    => $project->id,
                'company_id'    => $request->user()->company_id,
                'present'       => $data['present'],
                'task_assigned' => $data['task_assigned'] ?? null,
            ]
        );

        return response()->json(['attendance' => $att]);
    }
}
