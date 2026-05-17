<?php

namespace App\Http\Controllers;

use App\Models\DailyAttendance;
use App\Models\Project;
use App\Models\ProjectWorker;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

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
            ->get(); // Retourne tous (actifs + inactifs) — frontend filtre par is_active

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
                    'id'              => $att->id,
                    'present'         => $att->present,
                    'statut'          => $att->statut,
                    'heures_normales' => $att->heures_normales,
                    'heures_sup'      => $att->heures_sup,
                    'task_assigned'   => $att->task_assigned,
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
            'name'       => 'required|string|max:120',
            'trade'      => ['required', 'string', Rule::in(array_values(config('btp.trades_btp')))],
            'phone'      => 'nullable|string|max:30',
            'statut'     => ['sometimes', Rule::in(['permanent','temporaire','interimaire','sous_traitant','etam','cadre'])],
            'date_debut' => 'nullable|date',
            'date_fin'   => 'nullable|date|after_or_equal:date_debut',
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
            'trade'     => ['sometimes', 'string', Rule::in(array_values(config('btp.trades_btp')))],
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

    /** GET /api/projects/{project}/workers/export?date_from=&date_to= */
    public function export(Request $request, Project $project): Response
    {
        $this->authorize('viewAny', [ProjectWorker::class, $project]);

        $data = $request->validate([
            'date_from' => 'required|date_format:Y-m-d',
            'date_to'   => 'required|date_format:Y-m-d|after_or_equal:date_from',
        ]);

        $workers = ProjectWorker::where('project_id', $project->id)
            ->where('company_id', $request->user()->company_id)
            ->orderBy('trade')
            ->orderBy('name')
            ->get();

        $dates = collect();
        $current = \Carbon\Carbon::parse($data['date_from']);
        $end     = \Carbon\Carbon::parse($data['date_to']);
        while ($current->lte($end)) {
            $dates->push($current->toDateString());
            $current->addDay();
        }

        $attendances = DailyAttendance::where('project_id', $project->id)
            ->whereBetween('log_date', [$data['date_from'], $data['date_to']])
            ->get()
            ->groupBy('worker_id');

        $rows = $workers->map(function (ProjectWorker $w) use ($dates, $attendances) {
            $workerAtts = $attendances->get($w->id, collect())->keyBy(fn($a) => $a->log_date->toDateString());
            $dayMap = $dates->mapWithKeys(fn($d) => [$d => $workerAtts->get($d)?->present ?? null]);
            return [
                'worker' => $w,
                'days'   => $dayMap,
                'total'  => $dayMap->filter(fn($v) => $v === true)->count(),
            ];
        });

        $pdf = Pdf::loadView('pdf.attendance', [
            'project'      => $project,
            'dates'        => $dates,
            'rows'         => $rows,
            'date_from'    => $data['date_from'],
            'date_to'      => $data['date_to'],
            'generated_at' => now()->format('d/m/Y H:i'),
        ])->setPaper('a4', 'landscape');

        $filename = 'pointage-' . $project->code . '-' . $data['date_from'] . '_' . $data['date_to'] . '.pdf';
        return $pdf->download($filename);
    }

    /** POST /api/projects/{project}/workers/attendance */
    public function attendance(Request $request, Project $project): JsonResponse
    {
        $this->authorize('create', [ProjectWorker::class, $project]);

        $validStatuts = ['present', 'absent', 'conge', 'maladie', 'demi_journee'];

        $data = $request->validate([
            'worker_id'       => 'required|integer|exists:project_workers,id',
            'log_date'        => 'required|date_format:Y-m-d',
            'statut'          => ['sometimes', 'string', \Illuminate\Validation\Rule::in($validStatuts)],
            'present'         => 'sometimes|boolean',
            'heures_normales' => 'sometimes|numeric|min:0|max:24',
            'heures_sup'      => 'sometimes|numeric|min:0|max:12',
            'task_assigned'   => 'nullable|string|max:120',
        ]);

        // Déduire le statut depuis present (compatibilité ascendante)
        if (!isset($data['statut']) && isset($data['present'])) {
            $data['statut'] = $data['present'] ? 'present' : 'absent';
        }
        $data['statut'] ??= 'present';
        $data['present'] = in_array($data['statut'], ['present', 'demi_journee']);

        // Ajuster heures_normales pour la demi-journée
        if ($data['statut'] === 'demi_journee' && !isset($data['heures_normales'])) {
            $data['heures_normales'] = 4.00;
        }

        $att = DailyAttendance::updateOrCreate(
            ['worker_id' => $data['worker_id'], 'log_date' => $data['log_date']],
            [
                'project_id'      => $project->id,
                'company_id'      => $request->user()->company_id,
                'present'         => $data['present'],
                'statut'          => $data['statut'],
                'heures_normales' => $data['heures_normales'] ?? 8.00,
                'heures_sup'      => $data['heures_sup'] ?? 0,
                'task_assigned'   => $data['task_assigned'] ?? null,
            ]
        );

        return response()->json(['attendance' => $att]);
    }
}
