<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Services\ProjectFinancialMetricsService;
use App\Support\Roles;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PortfolioCostsController extends Controller
{
    public function __construct(private ProjectFinancialMetricsService $metricsService) {}

    public function index(Request $request): JsonResponse
    {
        abort_unless(
            in_array($request->user()->role->name, Roles::FINANCE),
            403,
            'Accès réservé à la direction et à la comptabilité.'
        );

        $companyId = $request->user()->company_id;

        $projects = Project::query()
            ->where('company_id', $companyId)
            ->where('status', 'active')
            ->with(['budgetEntries', 'invoices', 'dqeVersions'])
            ->get();

        $projectData = $projects->map(function (Project $project) {
            $metrics = $this->metricsService->compute($project);

            $alert = $metrics['ecart'] < 0
                && $metrics['budget_ref'] > 0
                && abs($metrics['ecart'] / $metrics['budget_ref']) > 0.1;

            return [
                'id'             => $project->id,
                'name'           => $project->name,
                'code'           => $project->code,
                'status'         => $project->status,
                'budget_ref'     => $metrics['budget_ref'],
                'engage'         => $metrics['engage'],
                'realise'        => $metrics['realise'],
                'rac'            => $metrics['rac'],
                'cat'            => $metrics['cat'],
                'ecart'          => $metrics['ecart'],
                'taux_realise'   => $metrics['taux_realise'],
                'taux_engage'    => $metrics['taux_engage'],
                'alert'          => $alert,
                // Legacy fields for existing dashboard
                'budget_amount'  => (float) $project->budget_amount,
                'previsionnel'   => (float) $project->budgetEntries->where('type', 'previsionnel')->sum('amount'),
                'engagement'     => $metrics['engage'],
                'paiement'       => $metrics['realise'],
                'solde'          => $metrics['ecart'],
                'taux_engagement'=> $metrics['taux_engage'],
                'taux_paiement'  => $metrics['taux_realise'],
            ];
        });

        $totals = [
            'budget_ref' => $projectData->sum('budget_ref'),
            'engage'     => $projectData->sum('engage'),
            'realise'    => $projectData->sum('realise'),
            'rac'        => $projectData->sum('rac'),
            'cat'        => $projectData->sum('cat'),
            'ecart'      => $projectData->sum('ecart'),
            // Legacy
            'previsionnel'    => $projectData->sum('previsionnel'),
            'engagement'      => $projectData->sum('engage'),
            'paiement'        => $projectData->sum('realise'),
            'solde'           => $projectData->sum('solde'),
        ];

        $budRef = $totals['budget_ref'];
        $totals['taux_realise']   = $budRef > 0 ? round($totals['realise'] / $budRef * 100, 1) : 0;
        $totals['taux_engage']    = $budRef > 0 ? round($totals['engage'] / $budRef * 100, 1) : 0;
        $totals['taux_engagement'] = $totals['taux_engage'];
        $totals['taux_paiement']   = $totals['taux_realise'];

        return response()->json([
            'totals'   => $totals,
            'projects' => $projectData->values(),
        ]);
    }
}
