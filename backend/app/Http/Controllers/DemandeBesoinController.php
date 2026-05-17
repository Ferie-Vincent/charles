<?php

namespace App\Http\Controllers;

use App\Events\DemandeBesoinApproved;
use App\Events\DemandeBesoinDelivered;
use App\Models\BudgetEntry;
use App\Models\DemandeBesoin;
use App\Support\Roles;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class DemandeBesoinController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user  = $request->user();
        $role  = $user->role->name;

        $query = DemandeBesoin::query()
            ->where('company_id', $user->company_id)
            ->with(['project:id,name,code', 'requester:id,name', 'approver:id,name',
                    'preparer:id,name', 'recorder:id,name'])
            ->latest();

        // Terrain : uniquement leurs propres demandes sur leurs projets
        if (in_array($role, Roles::TERRAIN)) {
            $query->where('requested_by', $user->id);
        }
        // Logistique : soumis (aperçu lecture seule) + leurs propres statuts de workflow
        elseif (in_array($role, Roles::LOGISTICS)) {
            $query->whereIn('status', ['soumis', 'approuve', 'en_preparation', 'livre', 'comptabilise']);
        }
        // Comptable : uniquement livré (prêt à comptabiliser)
        elseif ($role === 'comptable') {
            $query->whereIn('status', ['livre', 'comptabilise']);
        }
        // Direction + métreur : tout

        return response()->json(['data' => $query->get()]);
    }

    public function store(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_unless(in_array($user->role->name, [...Roles::TERRAIN, ...Roles::MANAGEMENT]), 403);

        $data = $request->validate([
            'project_id'     => [
                'required',
                Rule::exists('projects', 'id')->where('company_id', $request->user()->company_id),
            ],
            'title'          => 'required|string|max:255',
            'description'    => 'nullable|string',
            'category'       => 'required|in:materiaux,equipement,sous-traitance,main-oeuvre,autre',
            'quantity'       => 'nullable|numeric|min:0',
            'unit'           => 'nullable|string|max:50',
            'estimated_cost' => 'nullable|numeric|min:0',
            'urgency'        => 'required|in:normal,urgent,critique',
            'notes'          => 'nullable|string',
        ]);

        $proj = \App\Models\Project::find($data['project_id']);
        abort_if($proj && $proj->status === 'completed', 422, 'Impossible de créer une demande sur un projet terminé.');

        $demande = DemandeBesoin::create([
            ...$data,
            'company_id'   => $user->company_id,
            'requested_by' => $user->id,
            'status'       => 'soumis',
        ]);

        return response()->json(['data' => $demande->load(['project:id,name,code', 'requester:id,name'])], 201);
    }

    public function approve(Request $request, DemandeBesoin $demande): JsonResponse
    {
        $user = $request->user();
        abort_if($demande->company_id !== $user->company_id, 403);
        abort_unless(in_array($user->role->name, Roles::MANAGEMENT), 403);
        abort_unless($demande->status === 'soumis', 422);

        $demande->update([
            'status'      => 'approuve',
            'approved_by' => $user->id,
            'approved_at' => now(),
        ]);

        event(new DemandeBesoinApproved($demande, $user));

        // Calcul avertissement budget (non bloquant)
        $budgetWarning = null;
        $project       = $demande->project;

        if ($project && $demande->estimated_cost > 0) {
            $budgetRef = (float) ($project->dqeVersions()
                ->where('status', 'validated')
                ->orderByDesc('version_number')
                ->value('total_ht') ?? $project->budget_amount ?? 0);

            if ($budgetRef > 0) {
                $engagedDemandes = DemandeBesoin::where('project_id', $project->id)
                    ->whereIn('status', ['approuve', 'en_preparation', 'livre', 'comptabilise'])
                    ->where('id', '!=', $demande->id)
                    ->sum('estimated_cost');

                $engagedInvoices = $project->invoices()
                    ->whereIn('status', ['validee', 'payee'])
                    ->sum('amount_ht');

                $disponible = $budgetRef - $engagedDemandes - $engagedInvoices;

                if ($demande->estimated_cost > $disponible) {
                    $budgetWarning = [
                        'budget_ref'  => round($budgetRef, 2),
                        'engage'      => round($engagedDemandes + $engagedInvoices, 2),
                        'disponible'  => round($disponible, 2),
                        'demande'     => round($demande->estimated_cost, 2),
                        'depassement' => round($demande->estimated_cost - $disponible, 2),
                    ];
                }
            }
        }

        return response()->json([
            'data'           => $demande->fresh(),
            'budget_warning' => $budgetWarning,
        ]);
    }

    public function reject(Request $request, DemandeBesoin $demande): JsonResponse
    {
        $user = $request->user();
        abort_if($demande->company_id !== $user->company_id, 403);
        abort_unless(in_array($user->role->name, Roles::MANAGEMENT), 403);
        abort_unless($demande->status === 'soumis', 422);

        $request->validate(['reason' => 'required|string']);

        $demande->update([
            'status'           => 'rejete',
            'approved_by'      => $user->id,
            'approved_at'      => now(),
            'rejection_reason' => $request->reason,
        ]);

        return response()->json(['data' => $demande->fresh()]);
    }

    public function resubmit(Request $request, DemandeBesoin $demande): JsonResponse
    {
        $user = $request->user();
        abort_if($demande->company_id !== $user->company_id, 403);
        abort_unless($demande->status === 'rejete', 422, 'Seule une demande rejetée peut être resoumise.');

        $isCreator   = $demande->requested_by === $user->id;
        $isDirection = in_array($user->role->name, Roles::MANAGEMENT, true);
        abort_unless($isCreator || $isDirection, 403, 'Seul le demandeur ou la direction peut resoumettre.');

        $data = $request->validate(['correction_note' => 'nullable|string|max:500']);

        $demande->update([
            'status'           => 'soumis',
            'approved_by'      => null,
            'approved_at'      => null,
            'rejection_reason' => null,
            'notes'            => isset($data['correction_note']) && $data['correction_note']
                ? ($demande->notes ? $demande->notes . "\n[Correction] " . $data['correction_note'] : $data['correction_note'])
                : $demande->notes,
        ]);

        return response()->json(['data' => $demande->fresh(['project:id,name,code', 'requester:id,name'])]);
    }

    public function prepare(Request $request, DemandeBesoin $demande): JsonResponse
    {
        $user = $request->user();
        abort_if($demande->company_id !== $user->company_id, 403);
        abort_unless(in_array($user->role->name, [...Roles::LOGISTICS, ...Roles::MANAGEMENT]), 403);
        abort_unless($demande->status === 'approuve', 422);

        $demande->update([
            'status'      => 'en_preparation',
            'prepared_by' => $user->id,
            'prepared_at' => now(),
        ]);

        return response()->json(['data' => $demande->fresh()]);
    }

    public function deliver(Request $request, DemandeBesoin $demande): JsonResponse
    {
        $user = $request->user();
        abort_if($demande->company_id !== $user->company_id, 403);
        abort_unless(in_array($user->role->name, [...Roles::LOGISTICS, ...Roles::MANAGEMENT]), 403);
        abort_unless($demande->status === 'en_preparation', 422);

        $demande->update([
            'status'       => 'livre',
            'delivered_at' => now(),
            'delivered_by' => $user->id,
        ]);

        event(new DemandeBesoinDelivered($demande->fresh(), $user));

        return response()->json(['data' => $demande->fresh()]);
    }

    public function record(Request $request, DemandeBesoin $demande): JsonResponse
    {
        $user = $request->user();
        abort_if($demande->company_id !== $user->company_id, 403);
        abort_unless(in_array($user->role->name, Roles::FINANCE), 403);
        abort_unless($demande->status === 'livre', 422);

        $request->validate(['actual_cost' => 'required|numeric|min:0']);

        // Correspondance catégorie demande → catégorie BudgetEntry
        $categoryMap = [
            'materiaux'      => 'Matériaux',
            'equipement'     => 'Équipements',
            'sous-traitance' => 'Sous-traitance',
            'main-oeuvre'    => "Main d'œuvre",
            'autre'          => 'Matériaux',
        ];

        $actualCost = $request->actual_cost;

        $result = DB::transaction(function () use ($demande, $user, $categoryMap, $actualCost) {
            $locked = DemandeBesoin::where('id', $demande->id)->lockForUpdate()->first();
            abort_unless($locked->status === 'livre', 422, "Cette demande n'est pas dans l'état livré.");

            $entry = BudgetEntry::create([
                'project_id'  => $locked->project_id,
                'created_by'  => $user->id,
                'type'        => 'paiement',
                'category'    => $categoryMap[$locked->category] ?? 'Matériaux',
                'label'       => $locked->title,
                'amount'      => $actualCost,
                'entry_date'  => now()->toDateString(),
                'note'        => "Demande de besoin #" . $locked->id . ($locked->notes ? ' — ' . $locked->notes : ''),
            ]);

            if ($locked->preengagement_entry_id) {
                BudgetEntry::find($locked->preengagement_entry_id)?->delete();
            }

            $locked->update([
                'status'                 => 'comptabilise',
                'actual_cost'            => $actualCost,
                'recorded_by'            => $user->id,
                'recorded_at'            => now(),
                'budget_entry_id'        => $entry->id,
                'preengagement_entry_id' => null,
            ]);

            return ['demande' => $locked, 'entry' => $entry];
        });

        return response()->json(['data' => $result['demande']->fresh(), 'budget_entry' => $result['entry']]);
    }
}
