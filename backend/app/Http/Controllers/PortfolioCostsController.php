<?php

namespace App\Http\Controllers;

use App\Models\Project;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PortfolioCostsController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $companyId = $request->user()->company_id;

        $projects = Project::query()
            ->where('company_id', $companyId)
            ->with('budgetEntries')
            ->get();

        $projectData = $projects->map(function (Project $project) {
            $entries = $project->budgetEntries;

            $previsionnel = (float) $entries->where('type', 'previsionnel')->sum('amount');
            $engagement   = (float) $entries->where('type', 'engagement')->sum('amount');
            $paiement     = (float) $entries->where('type', 'paiement')->sum('amount');
            $solde        = $previsionnel - $paiement;

            $tauxEngagement = $previsionnel > 0
                ? round(($engagement / $previsionnel) * 100, 1)
                : 0;

            $tauxPaiement = $previsionnel > 0
                ? round(($paiement / $previsionnel) * 100, 1)
                : 0;

            return [
                'id'              => $project->id,
                'name'            => $project->name,
                'code'            => $project->code,
                'status'          => $project->status,
                'budget_amount'   => (float) $project->budget_amount,
                'previsionnel'    => $previsionnel,
                'engagement'      => $engagement,
                'paiement'        => $paiement,
                'solde'           => $solde,
                'taux_engagement' => $tauxEngagement,
                'taux_paiement'   => $tauxPaiement,
            ];
        });

        $totals = [
            'previsionnel' => $projectData->sum('previsionnel'),
            'engagement'   => $projectData->sum('engagement'),
            'paiement'     => $projectData->sum('paiement'),
            'solde'        => $projectData->sum('solde'),
        ];

        $totalPrev = $totals['previsionnel'];
        $totals['taux_engagement'] = $totalPrev > 0
            ? round(($totals['engagement'] / $totalPrev) * 100, 1)
            : 0;
        $totals['taux_paiement'] = $totalPrev > 0
            ? round(($totals['paiement'] / $totalPrev) * 100, 1)
            : 0;

        return response()->json([
            'totals'   => $totals,
            'projects' => $projectData->values(),
        ]);
    }
}
