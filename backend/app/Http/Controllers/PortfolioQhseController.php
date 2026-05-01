<?php

namespace App\Http\Controllers;

use App\Models\Incident;
use App\Models\Project;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PortfolioQhseController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $companyId = $request->user()->company_id;

        // Fetch all incidents scoped to company, with project and reporter
        $incidents = Incident::query()
            ->whereHas('project', fn ($q) => $q->where('company_id', $companyId))
            ->with([
                'project:id,name,code',
                'reporter:id,name',
            ])
            ->orderByDesc('occurred_at')
            ->limit(50)
            ->get();

        // Stats
        $totalIncidents = $incidents->count();
        $openIncidents  = $incidents->whereIn('status', ['ouvert', 'en_cours'])->count();
        $critiqueCount  = $incidents->where('severity', 'critique')->count();

        // Safety by project — compute monthly safety score for each active project
        $now       = Carbon::now();
        $monthFrom = $now->copy()->startOfMonth();
        $monthTo   = $now->copy()->endOfMonth();

        $activeProjects = Project::query()
            ->where('company_id', $companyId)
            ->where('status', 'actif')
            ->with(['incidents' => function ($q) use ($monthFrom, $monthTo) {
                $q->whereBetween('occurred_at', [$monthFrom, $monthTo])
                  ->select(['id', 'project_id', 'severity']);
            }])
            ->get(['id', 'name', 'code']);

        $safetyByProject = $activeProjects->map(function (Project $project) {
            $monthlyIncidents = $project->incidents;

            $mineur   = $monthlyIncidents->where('severity', 'mineur')->count();
            $majeur   = $monthlyIncidents->where('severity', 'majeur')->count();
            $critique = $monthlyIncidents->where('severity', 'critique')->count();

            $deductions = $mineur * 5 + $majeur * 15 + $critique * 30;
            $score      = max(0, 100 - $deductions);

            $grade = match (true) {
                $score >= 90 => 'A',
                $score >= 70 => 'B',
                $score >= 50 => 'C',
                default      => 'D',
            };

            return [
                'project_id'   => $project->id,
                'project_name' => $project->name,
                'project_code' => $project->code,
                'score'        => $score,
                'grade'        => $grade,
                'mineur'       => $mineur,
                'majeur'       => $majeur,
                'critique'     => $critique,
            ];
        });

        $avgSafetyScore = $safetyByProject->isNotEmpty()
            ? (int) round($safetyByProject->avg('score'))
            : 100;

        // Shape the incidents list
        $incidentList = $incidents->map(fn (Incident $inc) => [
            'id'            => $inc->id,
            'project_id'    => $inc->project_id,
            'project_name'  => $inc->project?->name ?? '—',
            'project_code'  => $inc->project?->code ?? '—',
            'type'          => $inc->type,
            'severity'      => $inc->severity,
            'description'   => $inc->description,
            'status'        => $inc->status,
            'occurred_at'   => $inc->occurred_at,
            'reporter_name' => $inc->reporter?->name ?? '—',
        ]);

        return response()->json([
            'stats' => [
                'total_incidents' => $totalIncidents,
                'open_incidents'  => $openIncidents,
                'critique_count'  => $critiqueCount,
                'avg_safety_score' => $avgSafetyScore,
            ],
            'incidents'         => $incidentList->values(),
            'safety_by_project' => $safetyByProject->values(),
        ]);
    }
}
