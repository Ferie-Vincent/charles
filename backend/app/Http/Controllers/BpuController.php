<?php
namespace App\Http\Controllers;

use App\Models\BpuLine;
use App\Models\BpuVersion;
use App\Models\Project;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BpuController extends Controller
{
    public function index(Project $project): JsonResponse
    {
        $this->authorize('view', $project);
        $versions = BpuVersion::where('project_id', $project->id)
            ->withCount('lines')
            ->orderByDesc('version_number')
            ->get();
        return response()->json(['versions' => $versions]);
    }

    public function show(Project $project, BpuVersion $version): JsonResponse
    {
        $this->authorize('view', $project);
        abort_if($version->project_id !== $project->id, 403);
        return response()->json(['version' => $version->load('lines')]);
    }

    public function store(Request $request, Project $project): JsonResponse
    {
        $this->authorize('update', $project);
        $data = $request->validate([
            'name'                  => 'required|string|max:120',
            'notes'                 => 'nullable|string',
            'lines'                 => 'required|array|min:1',
            'lines.*.lot'           => 'required|string|max:80',
            'lines.*.designation'   => 'required|string|max:255',
            'lines.*.unite'         => 'required|string|max:20',
            'lines.*.prix_unitaire' => 'required|numeric|min:0',
            'lines.*.ordre'         => 'sometimes|integer',
        ]);

        $lastVersion = BpuVersion::where('project_id', $project->id)->max('version_number') ?? 0;

        $version = BpuVersion::create([
            'project_id'     => $project->id,
            'company_id'     => $request->user()->company_id,
            'name'           => $data['name'],
            'version_number' => $lastVersion + 1,
            'notes'          => $data['notes'] ?? null,
        ]);

        foreach ($data['lines'] as $i => $line) {
            BpuLine::create([
                'bpu_version_id' => $version->id,
                'lot'            => $line['lot'],
                'designation'    => $line['designation'],
                'unite'          => $line['unite'],
                'prix_unitaire'  => $line['prix_unitaire'],
                'ordre'          => $line['ordre'] ?? $i,
            ]);
        }

        return response()->json(['version' => $version->load('lines')], 201);
    }

    public function validateVersion(Project $project, BpuVersion $version): JsonResponse
    {
        $this->authorize('update', $project);
        abort_if($version->project_id !== $project->id, 403);
        abort_if($version->status === 'validated', 422, 'Déjà validé.');
        BpuVersion::where('project_id', $project->id)->where('status', 'validated')
            ->update(['status' => 'archived']);
        $version->update(['status' => 'validated']);
        return response()->json(['version' => $version]);
    }
}
