<?php

namespace App\Http\Controllers;

use App\Models\Incident;
use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use App\Services\WhatsAppAlertService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class ProjectIncidentController extends Controller
{
    public function index(Project $project): JsonResponse
    {
        $this->authorize('view', $project);

        $incidents = $project->incidents()
            ->with('reporter:id,name')
            ->orderByDesc('occurred_at')
            ->get();

        return response()->json($incidents);
    }

    public function store(Request $request, Project $project): JsonResponse
    {
        $this->authorize('create', [Incident::class, $project]);

        $data = $request->validate([
            'type'              => 'required|string|max:100',
            'severity'          => 'required|in:mineur,majeur,critique',
            'description'       => 'required|string|max:2000',
            'location'          => 'nullable|string|max:255',
            'corrective_action' => 'nullable|string|max:2000',
            'witnesses'         => 'nullable|string|max:500',
            'occurred_at'       => 'required|date',
        ]);

        $incident = $project->incidents()->create([
            ...$data,
            'reported_by' => $request->user()->id,
            'status'      => 'ouvert',
        ]);

        $incident->load('reporter:id,name');

        if (in_array($incident->severity, ['critique', 'majeur'], true)) {
            $this->handleSeriousIncident($incident, $project);
        }

        return response()->json($incident, 201);
    }

    public function update(Request $request, Project $project, Incident $incident): JsonResponse
    {
        abort_if($incident->project_id !== $project->id, 404);

        $this->authorize('update', $incident);

        $data = $request->validate([
            'status'            => 'sometimes|in:ouvert,en_cours,resolu,ferme',
            'corrective_action' => 'sometimes|nullable|string|max:2000',
            'resolved_at'       => 'sometimes|nullable|date',
        ]);

        $incident->update($data);

        return response()->json($incident->fresh('reporter'));
    }

    public function destroy(Project $project, Incident $incident): Response
    {
        abort_if($incident->project_id !== $project->id, 404);

        $this->authorize('delete', $incident);

        $incident->delete();

        return response()->noContent();
    }

    private function handleSeriousIncident(Incident $incident, Project $project): void
    {
        if ($incident->severity === 'critique') {
            $msg = "INCIDENT CRITIQUE — {$project->name}\n"
                . "Type : {$incident->type}\n"
                . "Lieu : " . ($incident->location ?? 'Non précisé') . "\n"
                . "Déclaré par : {$incident->reporter->name}\n"
                . "Date : " . now()->format('d/m/Y H:i');
            app(WhatsAppAlertService::class)->send($msg);
        }

        $dueDays = $incident->severity === 'critique' ? 2 : 7;

        $dtUser = User::whereHas('role', fn($q) => $q->where('name', 'directeur-technique'))
            ->where('company_id', $project->company_id)
            ->first();

        Task::create([
            'company_id'   => $project->company_id,
            'assigned_to'  => $dtUser?->id,
            'assigned_by'  => $incident->reported_by,
            'title'        => "Action corrective – Incident {$incident->severity} #{$incident->id} – {$project->name}",
            'detail'       => "Description : {$incident->description}\nType : {$incident->type}\nLieu : " . ($incident->location ?? 'N/A'),
            'priority'     => $incident->severity === 'critique' ? 'haute' : 'normale',
            'role_target'  => 'directeur-technique',
            'project_code' => $project->code,
            'status'       => 'a_faire',
            'source'       => 'auto',
            'due_date'     => now()->addDays($dueDays)->toDateString(),
        ]);
    }

    public function pdf(Project $project, Incident $incident): Response
    {
        $this->authorize('view', $project);

        $incident->load('reporter:id,name', 'project:id,name,code,location');

        $pdf = Pdf::loadView('pdf.incident', [
            'incident' => $incident,
            'project'  => $project,
        ])->setPaper('a4');

        $filename = 'incident-' . $incident->id . '-' . now()->format('Ymd') . '.pdf';

        return $pdf->download($filename);
    }
}
