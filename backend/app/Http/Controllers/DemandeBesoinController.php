<?php

namespace App\Http\Controllers;

use App\Models\BudgetEntry;
use App\Models\DemandeBesoin;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class DemandeBesoinController extends Controller
{
    private const TERRAIN   = ['chef-chantier', 'conducteur-travaux'];
    private const DIRECTION = ['direction', 'directeur-technique'];
    private const LOGISTIQUE = ['moyens-generaux'];
    private const COMPTABLE = ['comptable'];

    public function index(Request $request): JsonResponse
    {
        $user  = $request->user();
        $role  = $user->role->name;

        $query = DemandeBesoin::query()
            ->where('company_id', $user->company_id)
            ->with(['project:id,name,code', 'requester:id,name', 'approver:id,name',
                    'preparer:id,name', 'recorder:id,name'])
            ->latest();

        // Terrain: only their own requests on their projects
        if (in_array($role, self::TERRAIN)) {
            $query->where('requested_by', $user->id);
        }
        // Logistique: only approved/en_preparation
        elseif (in_array($role, self::LOGISTIQUE)) {
            $query->whereIn('status', ['approuve', 'en_preparation', 'livre', 'comptabilise']);
        }
        // Comptable: only livré (ready to record)
        elseif (in_array($role, self::COMPTABLE)) {
            $query->whereIn('status', ['livre', 'comptabilise']);
        }
        // Direction + metreur: all

        return response()->json(['data' => $query->get()]);
    }

    public function store(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_unless(in_array($user->role->name, [...self::TERRAIN, ...self::DIRECTION]), 403);

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
        abort_unless(in_array($user->role->name, self::DIRECTION), 403);
        abort_unless($demande->status === 'soumis', 422);

        $demande->update([
            'status'      => 'approuve',
            'approved_by' => $user->id,
            'approved_at' => now(),
        ]);

        return response()->json(['data' => $demande->fresh()]);
    }

    public function reject(Request $request, DemandeBesoin $demande): JsonResponse
    {
        $user = $request->user();
        abort_if($demande->company_id !== $user->company_id, 403);
        abort_unless(in_array($user->role->name, self::DIRECTION), 403);
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

    public function prepare(Request $request, DemandeBesoin $demande): JsonResponse
    {
        $user = $request->user();
        abort_if($demande->company_id !== $user->company_id, 403);
        abort_unless(in_array($user->role->name, [...self::LOGISTIQUE, ...self::DIRECTION]), 403);
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
        abort_unless(in_array($user->role->name, [...self::LOGISTIQUE, ...self::DIRECTION]), 403);
        abort_unless($demande->status === 'en_preparation', 422);

        $demande->update([
            'status'       => 'livre',
            'delivered_at' => now(),
            'delivered_by' => $user->id,
        ]);

        return response()->json(['data' => $demande->fresh()]);
    }

    public function record(Request $request, DemandeBesoin $demande): JsonResponse
    {
        $user = $request->user();
        abort_if($demande->company_id !== $user->company_id, 403);
        abort_unless(in_array($user->role->name, [...self::COMPTABLE, ...self::DIRECTION]), 403);
        abort_unless($demande->status === 'livre', 422);

        $request->validate(['actual_cost' => 'required|numeric|min:0']);

        // Map demande category to BudgetEntry category
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

            $locked->update([
                'status'          => 'comptabilise',
                'actual_cost'     => $actualCost,
                'recorded_by'     => $user->id,
                'recorded_at'     => now(),
                'budget_entry_id' => $entry->id,
            ]);

            return ['demande' => $locked, 'entry' => $entry];
        });

        return response()->json(['data' => $result['demande']->fresh(), 'budget_entry' => $result['entry']]);
    }
}
