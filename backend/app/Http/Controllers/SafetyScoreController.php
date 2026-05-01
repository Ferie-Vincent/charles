<?php

namespace App\Http\Controllers;

use App\Models\Project;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SafetyScoreController extends Controller
{
    public function show(Request $request, Project $project): JsonResponse
    {
        $this->authorize('view', $project);

        $now   = Carbon::now();
        $from  = $now->copy()->startOfMonth();
        $to    = $now->copy()->endOfMonth();

        $incidents = $project->incidents()
            ->whereBetween('occurred_at', [$from, $to])
            ->get(['severity', 'status']);

        $counts = [
            'mineur'   => $incidents->where('severity', 'mineur')->count(),
            'majeur'   => $incidents->where('severity', 'majeur')->count(),
            'critique' => $incidents->where('severity', 'critique')->count(),
        ];
        $counts['total'] = array_sum($counts);

        $resolved = $incidents->whereIn('status', ['resolu', 'ferme'])->count();

        $deductions = $counts['mineur'] * 5 + $counts['majeur'] * 15 + $counts['critique'] * 30;
        $score      = max(0, 100 - $deductions);

        $grade = match (true) {
            $score >= 80 => 'A',
            $score >= 60 => 'B',
            $score >= 40 => 'C',
            default      => 'D',
        };

        return response()->json([
            'score'    => $score,
            'grade'    => $grade,
            'counts'   => $counts,
            'resolved' => $resolved,
            'period'   => $from->translatedFormat('F Y'),
        ]);
    }
}
