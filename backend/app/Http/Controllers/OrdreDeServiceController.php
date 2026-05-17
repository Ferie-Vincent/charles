<?php
namespace App\Http\Controllers;

use App\Models\OrdreDeService;
use App\Models\Project;
use App\Models\ProjectMember;
use App\Models\User;
use App\Notifications\OsNouveauNotification;
use App\Support\Roles;
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

        // Les types d'OS modifiant le cycle de vie (demarrage/arret/reprise) mutent l'état contractuel du projet
        // — réservés à la Direction et au Directeur Technique uniquement
        $lifecycleTypes = ['demarrage', 'arret', 'reprise'];
        if (in_array($data['type'], $lifecycleTypes)) {
            abort_unless(
                in_array($request->user()->role->name, Roles::MANAGEMENT),
                403,
                "Les ordres de service de type « {$data['type']} » modifient l'état contractuel du chantier — réservés à la Direction ou au Directeur Technique."
            );
        }

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

        // Mise à jour automatique de l'état du projet selon le type d'OS
        if ($data['type'] === 'demarrage') {
            $project->update(['lifecycle_status' => 'execution', 'is_arrete' => false, 'arret_depuis' => null]);
        } elseif ($data['type'] === 'arret') {
            $project->update(['is_arrete' => true, 'arret_depuis' => $data['date_os']]);
        } elseif ($data['type'] === 'reprise') {
            $project->update(['is_arrete' => false, 'arret_depuis' => null]);
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

        // Item 13 : notifier les chefs de chantier affectés à ce projet
        $os->load('project:id,name,code,company_id');
        $memberIds = ProjectMember::where('project_id', $project->id)->pluck('user_id');
        User::whereHas('role', fn($q) => $q->where('name', Roles::CHEF_CHANTIER_SLUG))
            ->where('company_id', $project->company_id)
            ->whereIn('id', $memberIds)
            ->where('id', '!=', $request->user()->id)
            ->get()
            ->each(fn($u) => $u->notify(new OsNouveauNotification($os)));

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
