<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Services\HealthScoreService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class HealthScoreController extends Controller
{
    public function show(Request $request, Project $project): JsonResponse
    {
        $this->authorize('view', $project);

        $data = (new HealthScoreService())->compute($project);

        return response()->json($data);
    }
}
