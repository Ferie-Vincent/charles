<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Models\ProjectPhoto;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ProjectPhotoController extends Controller
{
    public function index(Request $request, Project $project): JsonResponse
    {
        $this->authorize('view', $project);

        $photos = ProjectPhoto::where('project_id', $project->id)
            ->with('user:id,name')
            ->orderBy('taken_at', 'desc')
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(fn ($p) => [
                'id'         => $p->id,
                'url'        => Storage::disk('public')->url($p->path),
                'caption'    => $p->caption,
                'tag'        => $p->tag,
                'taken_at'   => $p->taken_at?->format('Y-m-d'),
                'uploaded_by'=> $p->user?->name,
                'created_at' => $p->created_at->toISOString(),
            ]);

        return response()->json(['data' => $photos]);
    }

    public function store(Request $request, Project $project): JsonResponse
    {
        $this->authorize('update', $project);

        $request->validate([
            'photo'   => ['required', 'image', 'max:10240'],
            'caption' => ['nullable', 'string', 'max:255'],
            'tag'     => ['nullable', 'string', 'max:64'],
            'taken_at'=> ['nullable', 'date'],
        ]);

        $path = $request->file('photo')->store("projects/{$project->id}/photos", 'public');

        $photo = ProjectPhoto::create([
            'project_id' => $project->id,
            'user_id'    => $request->user()->id,
            'path'       => $path,
            'caption'    => $request->input('caption'),
            'tag'        => $request->input('tag'),
            'taken_at'   => $request->input('taken_at'),
        ]);

        return response()->json([
            'id'          => $photo->id,
            'url'         => Storage::disk('public')->url($path),
            'caption'     => $photo->caption,
            'tag'         => $photo->tag,
            'taken_at'    => $photo->taken_at?->format('Y-m-d'),
            'uploaded_by' => $request->user()->name,
            'created_at'  => $photo->created_at->toISOString(),
        ], 201);
    }

    public function destroy(Request $request, Project $project, ProjectPhoto $photo): JsonResponse
    {
        $this->authorize('update', $project);

        if ($photo->project_id !== $project->id) {
            abort(404);
        }

        Storage::disk('public')->delete($photo->path);
        $photo->delete();

        return response()->json(null, 204);
    }
}
