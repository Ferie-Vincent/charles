<?php

namespace App\Http\Controllers;

use App\Models\AiFeedbackLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AiFeedbackController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'feature'            => ['required', 'string', 'max:100'],
            'project_id'         => ['nullable', 'exists:projects,id'],
            'rating'             => ['required', 'in:positive,negative'],
            'comment'            => ['nullable', 'string', 'max:1000'],
            'ai_output_excerpt'  => ['nullable', 'array'],
            'model_used'         => ['nullable', 'string', 'max:100'],
        ]);

        AiFeedbackLog::create([
            ...$data,
            'user_id'    => $request->user()->id,
            'company_id' => $request->user()->company_id,
        ]);

        return response()->json(['message' => 'Merci pour votre retour.'], 201);
    }
}
