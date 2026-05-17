<?php
namespace App\Http\Controllers;

use App\Models\Avenant;
use App\Models\Project;
use App\Models\User;
use App\Notifications\AvenantSigneNotification;
use App\Support\Roles;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AvenantController extends Controller
{
    public function index(Request $request, Project $project): JsonResponse
    {
        $this->authorize('view', $project);
        $avenants = Avenant::where('project_id', $project->id)
            ->orderBy('numero')
            ->get();
        $totalAvenants = $avenants->sum('montant_ht');
        return response()->json([
            'avenants'       => $avenants,
            'total_avenants' => $totalAvenants,
            'montant_final'  => (float)($project->montant_marche ?? 0) + $totalAvenants,
        ]);
    }

    public function store(Request $request, Project $project): JsonResponse
    {
        $this->authorize('update', $project);
        $data = $request->validate([
            'numero'                     => 'required|string|max:20',
            'objet'                      => 'required|string|max:255',
            'type'                       => 'required|in:montant,delai,montant_et_delai',
            'montant_ht'                 => 'required|numeric',
            'delai_supplementaire_jours' => 'sometimes|integer|min:0',
            'notes'                      => 'nullable|string',
        ]);
        $avenant = Avenant::create([
            ...$data,
            'project_id' => $project->id,
            'company_id' => $request->user()->company_id,
            'created_by' => $request->user()->id,
        ]);
        return response()->json(['avenant' => $avenant], 201);
    }

    public function update(Request $request, Project $project, Avenant $avenant): JsonResponse
    {
        $this->authorize('update', $project);
        abort_if($avenant->status === 'signe', 422, 'Un avenant signé ne peut pas être modifié.');
        $wasSigne = $avenant->status === 'signe';
        $data = $request->validate([
            'objet'                      => 'sometimes|string|max:255',
            'type'                       => 'sometimes|in:montant,delai,montant_et_delai',
            'montant_ht'                 => 'sometimes|numeric',
            'delai_supplementaire_jours' => 'sometimes|integer|min:0',
            'status'                     => 'sometimes|in:brouillon,soumis,signe,refuse',
            'date_signature'             => 'nullable|date',
            'notes'                      => 'nullable|string',
        ]);
        $avenant->update($data);

        $situationsActivesCount = 0;
        if (!$wasSigne && ($data['status'] ?? null) === 'signe') {
            $avenant->load('project:id,name,code');
            User::whereHas('role', fn($q) => $q->whereIn('name', [
                Roles::METREUR_ECONOMISTE_SLUG,
                Roles::CONDUCTEUR_TRAVAUX_SLUG,
            ]))
                ->where('company_id', $avenant->company_id)
                ->get()
                ->each(fn($u) => $u->notify(new AvenantSigneNotification($avenant)));

            $situationsActivesCount = \App\Models\SituationTravaux::where('project_id', $avenant->project_id)
                ->whereIn('status', ['brouillon', 'en_revue_ct', 'en_revue_dt', 'soumise', 'contestee'])
                ->count();
        }

        return response()->json([
            'avenant' => $avenant,
            'situations_actives_warning' => $situationsActivesCount > 0
                ? "Avenant signé avec {$situationsActivesCount} situation(s) en cours. La nouvelle base de calcul s'appliquera aux prochaines situations uniquement."
                : null,
        ]);
    }

    public function destroy(Project $project, Avenant $avenant): JsonResponse
    {
        $this->authorize('update', $project);
        abort_if($avenant->status === 'signe', 422, 'Un avenant signé ne peut pas être supprimé.');
        $avenant->delete();
        return response()->json(null, 204);
    }
}
