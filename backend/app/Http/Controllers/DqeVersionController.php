<?php

namespace App\Http\Controllers;

use App\Models\DqeLine;
use App\Models\DqeVersion;
use App\Models\Project;
use App\Support\Roles;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class DqeVersionController extends Controller
{
    public function index(Request $request, Project $project): JsonResponse
    {
        $this->authorize('view', $project);

        $versions = $project->dqeVersions()
            ->withCount('lines')
            ->orderBy('version_number')
            ->get();

        return response()->json($versions);
    }

    public function store(Request $request, Project $project): JsonResponse
    {
        $this->authorize('update', $project);

        abort_unless(in_array($request->user()->role->name, Roles::DQE_VIEWERS), 403, 'Création de DQE réservée aux métreurs et conducteurs de travaux.');

        $data = $request->validate([
            'name'  => 'required|string|max:200',
            'notes' => 'nullable|string',
        ]);

        $next = ($project->dqeVersions()->max('version_number') ?? 0) + 1;

        $version = $project->dqeVersions()->create([
            ...$data,
            'version_number' => $next,
            'created_by'     => $request->user()->id,
            'status'         => 'draft',
        ]);

        return response()->json($version, 201);
    }

    public function show(Request $request, Project $project, DqeVersion $dqeVersion): JsonResponse
    {
        $this->authorize('view', $project);
        abort_unless($dqeVersion->project_id === $project->id, 404);

        $dqeVersion->load('lines');

        $lots = $dqeVersion->lines
            ->groupBy('lot')
            ->map(fn ($lines, $lot) => [
                'lot'      => $lot,
                'lines'    => $lines->values(),
                'subtotal' => round($lines->sum('montant_ht'), 2),
            ])
            ->values();

        return response()->json([
            'version' => $dqeVersion,
            'lots'    => $lots,
        ]);
    }

    public function update(Request $request, Project $project, DqeVersion $dqeVersion): JsonResponse
    {
        $this->authorize('update', $project);
        abort_unless($dqeVersion->project_id === $project->id, 404);
        abort_if(
            in_array($dqeVersion->status, ['soumise', 'validated', 'archived']),
            422,
            'Ce DQE est verrouillé et ne peut plus être modifié.'
        );

        $data = $request->validate([
            'name'  => 'sometimes|string|max:200',
            'notes' => 'nullable|string',
        ]);

        $dqeVersion->update($data);

        return response()->json($dqeVersion);
    }

    public function destroy(Request $request, Project $project, DqeVersion $dqeVersion): JsonResponse
    {
        $this->authorize('update', $project);
        abort_unless($dqeVersion->project_id === $project->id, 404);
        abort_if(
            in_array($dqeVersion->status, ['soumise', 'validated', 'archived']),
            422,
            'Ce DQE est verrouillé et ne peut plus être modifié.'
        );

        $dqeVersion->delete();

        return response()->json(null, 204);
    }

    public function storeLine(Request $request, Project $project, DqeVersion $dqeVersion): JsonResponse
    {
        $this->authorize('update', $project);
        abort_unless($dqeVersion->project_id === $project->id, 404);
        abort_if(
            in_array($dqeVersion->status, ['soumise', 'validated', 'archived']),
            422,
            'Ce DQE est verrouillé et ne peut plus être modifié.'
        );

        $data = $request->validate([
            'lot'           => 'required|string|max:100',
            'ouvrage'       => 'required|string|max:500',
            'unite'         => 'required|string|max:20',
            'quantite'      => 'required|numeric|min:0',
            'prix_unitaire' => 'required|numeric|min:0',
            'ordre'         => 'nullable|integer|min:0',
        ]);

        $line = $dqeVersion->lines()->create($data);
        $dqeVersion->recomputeTotal();

        return response()->json($line, 201);
    }

    public function updateLine(
        Request $request,
        Project $project,
        DqeVersion $dqeVersion,
        DqeLine $dqeLine,
    ): JsonResponse {
        $this->authorize('update', $project);
        abort_unless($dqeVersion->project_id === $project->id, 404);
        abort_unless($dqeLine->dqe_version_id === $dqeVersion->id, 404);
        abort_if(
            in_array($dqeVersion->status, ['soumise', 'validated', 'archived']),
            422,
            'Ce DQE est verrouillé et ne peut plus être modifié.'
        );

        $data = $request->validate([
            'lot'           => 'sometimes|string|max:100',
            'ouvrage'       => 'sometimes|string|max:500',
            'unite'         => 'sometimes|string|max:20',
            'quantite'      => 'sometimes|numeric|min:0',
            'prix_unitaire' => 'sometimes|numeric|min:0',
            'ordre'         => 'nullable|integer|min:0',
        ]);

        $dqeLine->update($data);
        $dqeVersion->recomputeTotal();

        return response()->json($dqeLine);
    }

    public function destroyLine(
        Request $request,
        Project $project,
        DqeVersion $dqeVersion,
        DqeLine $dqeLine,
    ): JsonResponse {
        $this->authorize('update', $project);
        abort_unless($dqeVersion->project_id === $project->id, 404);
        abort_unless($dqeLine->dqe_version_id === $dqeVersion->id, 404);
        abort_if(
            in_array($dqeVersion->status, ['soumise', 'validated', 'archived']),
            422,
            'Ce DQE est verrouillé et ne peut plus être modifié.'
        );

        $dqeLine->delete();
        $dqeVersion->recomputeTotal();

        return response()->json(null, 204);
    }

    public function duplicate(Request $request, Project $project, DqeVersion $dqeVersion): JsonResponse
    {
        $this->authorize('update', $project);
        abort_unless($dqeVersion->project_id === $project->id, 404);

        abort_unless(in_array($request->user()->role->name, Roles::DQE_VIEWERS), 403, 'Création de DQE réservée aux métreurs et conducteurs de travaux.');

        $next = ($project->dqeVersions()->max('version_number') ?? 0) + 1;

        $copy = $project->dqeVersions()->create([
            'name'           => $dqeVersion->name . ' (copie)',
            'version_number' => $next,
            'created_by'     => $request->user()->id,
            'status'         => 'draft',
            'notes'          => $dqeVersion->notes,
            'total_ht'       => 0,
        ]);

        foreach ($dqeVersion->lines as $line) {
            $copy->lines()->create($line->only(['lot', 'ouvrage', 'unite', 'quantite', 'prix_unitaire', 'ordre']));
        }

        $copy->recomputeTotal();
        $copy->load('lines');

        return response()->json($copy, 201);
    }

    public function transition(Request $request, Project $project, DqeVersion $dqeVersion): JsonResponse
    {
        $this->authorize('update', $project);
        abort_unless($dqeVersion->project_id === $project->id, 404);

        $data = $request->validate(['status' => 'required|in:soumise,validated,archived,draft']);

        $user    = $request->user();
        $current = $dqeVersion->status;
        $to      = $data['status'];
        $role    = $user->role->name;

        $submitRoles  = Roles::DQE_SUBMITTERS;
        $dgRoles      = ['direction'];
        $archiveRoles = Roles::MANAGEMENT;

        if ($current === 'draft' && $to === 'soumise') {
            abort_unless(in_array($role, $submitRoles), 403, 'Soumission DQE réservée au DT, conducteur ou métreur.');
        } elseif ($current === 'draft' && $to === 'validated') {
            // DG peut valider directement (ex: DQE qu'il a créé lui-même)
            abort_unless(in_array($role, $dgRoles), 403, 'Validation directe réservée au Directeur Général.');
        } elseif ($current === 'soumise' && $to === 'validated') {
            abort_unless(in_array($role, $dgRoles), 403, 'Validation DQE réservée au Directeur Général.');
        } elseif ($current === 'soumise' && $to === 'draft') {
            abort_unless(in_array($role, $dgRoles), 403, 'Rejet DQE réservé au Directeur Général.');
        } elseif (in_array($current, ['draft', 'soumise', 'validated']) && $to === 'archived') {
            abort_unless(in_array($role, $archiveRoles), 403, 'Archivage réservé à la direction.');
        } else {
            abort(422, "Transition {$current} → {$to} non autorisée.");
        }

        $dqeVersion->update(['status' => $to]);

        return response()->json($dqeVersion);
    }

    public function pdf(Request $request, Project $project, DqeVersion $dqeVersion): Response
    {
        $this->authorize('view', $project);
        abort_unless($dqeVersion->project_id === $project->id, 404);

        $dqeVersion->load('lines');

        $lots = $dqeVersion->lines
            ->groupBy('lot')
            ->map(fn ($lines, $lot) => [
                'lot'      => $lot,
                'lines'    => $lines->values(),
                'subtotal' => round($lines->sum('montant_ht'), 2),
            ])
            ->values();

        $pdf = Pdf::loadView('pdf.dqe', compact('project', 'dqeVersion', 'lots'))
            ->setPaper('a4', 'landscape');

        $filename = 'dqe-' . $project->code . '-v' . $dqeVersion->version_number . '.pdf';

        return $pdf->download($filename);
    }
}
