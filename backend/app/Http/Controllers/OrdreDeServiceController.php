<?php
namespace App\Http\Controllers;

use App\Models\OrdreDeService;
use App\Models\Project;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class OrdreDeServiceController extends Controller
{
    public function index(Request $request, Project $project): JsonResponse
    {
        $this->authorize('view', $project);
        $os = OrdreDeService::where('project_id', $project->id)
            ->with('emetteur:id,name')
            ->orderByDesc('date_os')
            ->get();
        return response()->json(['ordres_de_service' => $os]);
    }

    public function store(Request $request, Project $project): JsonResponse
    {
        $this->authorize('update', $project);
        $data = $request->validate([
            'numero'              => 'required|string|max:20',
            'type'                => 'required|in:demarrage,travaux_supplementaires,arret,reprise,autre',
            'objet'               => 'required|string|max:255',
            'date_os'             => 'required|date',
            'delai_impact_jours'  => 'sometimes|integer|min:0',
            'description'         => 'nullable|string',
            'document'            => 'nullable|file|mimes:pdf|max:10240',
        ]);

        $path = null;
        if ($request->hasFile('document')) {
            $path = $request->file('document')->store("os/{$project->id}", 'public');
        }

        $os = OrdreDeService::create([
            ...$data,
            'project_id'    => $project->id,
            'company_id'    => $request->user()->company_id,
            'emis_par'      => $request->user()->id,
            'document_path' => $path,
        ]);

        // Auto-update project lifecycle_status when OS type = demarrage
        if ($data['type'] === 'demarrage') {
            $project->update(['lifecycle_status' => 'execution']);
        }

        return response()->json(['ordre_de_service' => $os->load('emetteur:id,name')], 201);
    }

    public function accuser(Request $request, Project $project, OrdreDeService $os): JsonResponse
    {
        $this->authorize('view', $project);
        $os->update([
            'accuse_reception' => true,
            'date_accuse'      => now()->toDateString(),
        ]);
        return response()->json(['ordre_de_service' => $os]);
    }

    public function destroy(Project $project, OrdreDeService $os): JsonResponse
    {
        $this->authorize('update', $project);
        if ($os->document_path) {
            Storage::disk('public')->delete($os->document_path);
        }
        $os->delete();
        return response()->json(null, 204);
    }
}
