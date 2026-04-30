<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreProjectRequest;
use App\Http\Requests\UpdateProjectRequest;
use App\Models\Project;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProjectController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $projects = Project::query()
            ->where('company_id', $request->user()->company_id)
            ->latest()
            ->get();

        return response()->json([
            'data' => $projects,
        ]);
    }

    public function store(StoreProjectRequest $request): JsonResponse
    {
        $project = Project::query()->create([
            ...$request->validated(),
            'company_id' => $request->user()->company_id,
        ]);

        return response()->json([
            'data' => $project,
        ], 201);
    }

    public function update(UpdateProjectRequest $request, Project $project): JsonResponse
    {
        abort_unless($project->company_id === $request->user()->company_id, 404);

        $project->update($request->validated());

        return response()->json([
            'data' => $project->fresh(),
        ]);
    }
}
