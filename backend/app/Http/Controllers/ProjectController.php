<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreProjectRequest;
use App\Http\Requests\UpdateProjectRequest;
use App\Models\Project;
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

        if (in_array($user->role->name, ['chef-chantier', 'conducteur-travaux'])) {
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

        $project->update($request->validated());

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
}
