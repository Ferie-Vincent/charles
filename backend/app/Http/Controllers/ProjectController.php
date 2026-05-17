<?php

namespace App\Http\Controllers;

use App\Events\ProjectCompleted;
use App\Http\Requests\StoreProjectRequest;
use App\Http\Requests\UpdateProjectRequest;
use App\Models\Project;
use App\Support\Roles;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ProjectController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Project::class);

        $user  = $request->user();
        $query = Project::query()->where('company_id', $user->company_id);

        if (in_array($user->role->name, Roles::TERRAIN)) {
            $query->whereHas('members', fn ($q) => $q->where('user_id', $user->id));
        }

        return response()->json(['data' => $query->latest()->get()]);
    }

    public function store(StoreProjectRequest $request): JsonResponse
    {
        $this->authorize('create', Project::class);

        $project = Project::query()->create([
            ...$request->validated(),
            'company_id' => $request->user()->company_id,
        ]);

        return response()->json([
            'data' => $project,
        ], 201);
    }

    public function show(Request $request, Project $project): JsonResponse
    {
        $this->authorize('view', $project);

        $project->load(['members.user.role', 'activities.user']);

        return response()->json(['data' => $project]);
    }

    public function update(UpdateProjectRequest $request, Project $project): JsonResponse
    {
        $this->authorize('update', $project);

        $role      = $request->user()->role->name;
        $validated = $request->validated();

        $data = match(true) {
            in_array($role, Roles::MANAGEMENT)  => $validated,
            $role === 'conducteur-travaux'       => collect($validated)->only(['status', 'target_progress', 'location', 'end_date'])->all(),
            $role === 'metreur-economiste'       => collect($validated)->only(['budget_amount', 'target_progress'])->all(),
            $role === 'chef-chantier'            => collect($validated)->only(['status', 'target_progress'])->all(),
            default                              => [],
        };

        abort_if(empty($data), 403, 'Aucun champ modifiable pour ce rôle.');

        if (isset($data['status']) && in_array($data['status'], ['completed', 'archived'], true)) {
            abort_unless(
                in_array($role, Roles::MANAGEMENT),
                403,
                'Les statuts "completed" et "archived" sont réservés à la direction et au directeur technique.'
            );
        }

        if (($data['status'] ?? null) === 'completed' && $project->status !== 'completed') {
            abort_unless(
                in_array($role, Roles::MANAGEMENT),
                403,
                'Clôture de chantier réservée à la direction et au directeur technique.'
            );

            $openIncidents = $project->incidents()->whereIn('status', ['ouvert', 'en_cours'])->count();
            abort_if($openIncidents > 0, 422, "Impossible de clôturer : {$openIncidents} incident(s) non résolu(s).");

            $bdcOpen = \App\Models\PurchaseOrder::where('project_id', $project->id)
                ->whereIn('status', ['soumis', 'approuve'])
                ->count();
            abort_if($bdcOpen > 0, 422, "Impossible de clôturer : {$bdcOpen} BDC en attente ou non reçu(s).");

            $facValide = $project->invoices()->where('status', 'validee')->count();
            abort_if($facValide > 0, 422, "Impossible de clôturer : {$facValide} facture(s) validée(s) non payée(s).");
        }

        $wasCompleted = $project->status === 'completed';
        $project->update($data);

        if (! $wasCompleted && ($data['status'] ?? null) === 'completed') {
            event(new ProjectCompleted($project->fresh(), $request->user()));
        }

        return response()->json([
            'data' => $project->fresh(),
        ]);
    }

    public function destroy(Request $request, Project $project): \Illuminate\Http\Response
    {
        $this->authorize('delete', $project);

        // Cleanup physical files before DB delete
        // Project photos
        Storage::disk('public')->deleteDirectory("projects/{$project->id}");
        // Invoice attachments (scoped by project via sub-directory convention)
        Storage::disk('public')->deleteDirectory("invoices/{$project->id}");
        // Purchase order files (scoped by project via sub-directory convention)
        Storage::disk('public')->deleteDirectory("purchase-orders/{$project->id}");
        // Note: GED documents have project_id nullOnDelete, files remain in company GED

        $project->delete(); // DB cascade handles child rows

        return response()->noContent();
    }

    public function setAvanceDemarrage(Request $request, Project $project): JsonResponse
    {
        $this->authorize('update', $project);
        abort_unless(in_array($request->user()->role->name, \App\Support\Roles::MANAGEMENT), 403, 'Seule la direction peut geler le montant d\'avance de démarrage.');

        $data = $request->validate([
            'montant_accorde'  => 'required|numeric|min:0',
            'accorde_le'       => 'required|date',
        ]);

        $project->update([
            'avance_demarrage_montant_accorde' => $data['montant_accorde'],
            'avance_demarrage_accorde_le'      => $data['accorde_le'],
            'avance_demarrage_accorde_par'     => $request->user()->id,
        ]);

        return response()->json(['project' => $project->fresh()]);
    }
}
