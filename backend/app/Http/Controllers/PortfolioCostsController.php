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
            ->with(['budgetEntries', 'invoices', 'dqeVersions'])
            ->get();

        $projectData = $projects->map(function (Project $project) {
            $dqeTotal     = (float) $project->dqeVersions->where('status', 'validated')->sum('total_ht');
            $budgetRef    = $dqeTotal > 0 ? $dqeTotal : (float) $project->budget_amount;

            $engagement   = (float) $project->budgetEntries->where('type', 'engagement')->sum('amount');
            $paiementBE   = (float) $project->budgetEntries->where('type', 'paiement')->sum('amount');

            $invoices     = $project->invoices;
            $realise      = max($paiementBE, (float) $invoices->whereIn('status', ['validee', 'payee'])->sum('amount_ht'));
            $engage       = max($engagement, (float) $invoices->where('status', 'soumise')->sum('amount_ht'));

            $rac          = max(0, $budgetRef - $engage - $realise);
            $cat          = $realise + $engage + $rac;
            $ecart        = $budgetRef - $cat;

            $tauxRealise  = $budgetRef > 0 ? round($realise / $budgetRef * 100, 1) : 0;
            $tauxEngage   = $budgetRef > 0 ? round($engage / $budgetRef * 100, 1) : 0;

            // Alert si écart > 10% négatif
            $alert = $ecart < 0 && $budgetRef > 0 && abs($ecart / $budgetRef) > 0.1;

            return [
                'id'             => $project->id,
                'name'           => $project->name,
                'code'           => $project->code,
                'status'         => $project->status,
                'budget_ref'     => $budgetRef,
                'engage'         => $engage,
                'realise'        => $realise,
                'rac'            => $rac,
                'cat'            => $cat,
                'ecart'          => $ecart,
                'taux_realise'   => $tauxRealise,
                'taux_engage'    => $tauxEngage,
                'alert'          => $alert,
                // Legacy fields for existing dashboard
                'budget_amount'  => (float) $project->budget_amount,
                'previsionnel'   => (float) $project->budgetEntries->where('type', 'previsionnel')->sum('amount'),
                'engagement'     => $engage,
                'paiement'       => $realise,
                'solde'          => $budgetRef - $realise,
                'taux_engagement'=> $tauxEngage,
                'taux_paiement'  => $tauxRealise,
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
