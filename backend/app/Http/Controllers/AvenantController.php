<?php
namespace App\Http\Controllers;

use App\Models\Avenant;
use App\Models\Project;
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
        return response()->json(['avenant' => $avenant]);
    }

    public function destroy(Project $project, Avenant $avenant): JsonResponse
    {
        $this->authorize('update', $project);
        abort_if($avenant->status === 'signe', 422, 'Un avenant signé ne peut pas être supprimé.');
        $avenant->delete();
        return response()->json(null, 204);
    }
}
