<?php

namespace App\Http\Controllers;

use App\Models\ProjectPhoto;
use App\Models\Project;
use App\Services\GroqService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class AiVisionController extends Controller
{
    public function __construct(private readonly GroqService $ai) {}

    public function analyzePhoto(Request $request, Project $project, ProjectPhoto $photo): JsonResponse
    {
        $this->authorize('view', $project);
        abort_if($photo->project_id !== $project->id, 404);

        // Load image from storage
        $path = $photo->path;
        if (! Storage::disk('public')->exists($path)) {
            return response()->json(['error' => 'Photo introuvable.'], 404);
        }

        $contents = Storage::disk('public')->get($path);
        if (! $contents) {
            return response()->json(['error' => 'Impossible de lire la photo.'], 500);
        }

        $mime     = Storage::disk('public')->mimeType($path) ?: 'image/jpeg';
        $b64      = base64_encode($contents);

        $prompt = "Tu es un expert BTP en Côte d'Ivoire. Analyse cette photo de chantier et fournis :\n"
            . "1. Description de l'état visible du chantier\n"
            . "2. Avancement apparent (estimation %)\n"
            . "3. Points de vigilance ou risques visibles\n"
            . "4. Recommandations\n\n"
            . ($photo->caption ? "Légende : {$photo->caption}\n" : '')
            . ($photo->tag ? "Tag : {$photo->tag}" : '');

        $result = $this->ai->analyzeImage($b64, $mime, $prompt);

        if (isset($result['error'])) {
            return response()->json(['error' => $result['error']], 503);
        }

        return response()->json([
            'analysis'  => $result['text'],
            'photo_id'  => $photo->id,
            'model'     => 'pixtral-12b-2409',
            'sources'   => [['label' => 'Photo chantier', 'data' => $photo->caption ?? $photo->path]],
        ]);
    }
}
