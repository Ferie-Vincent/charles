<?php

namespace App\Http\Controllers;

use App\Models\GeneralExpense;
use App\Models\Project;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PortfolioAccountingController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $companyId = $request->user()->company_id;

        $projects = Project::query()
            ->where('company_id', $companyId)
            ->with(['budgetEntries', 'invoices.supplier', 'dqeVersions'])
            ->get();

        $projectData = $projects->map(function (Project $project) {
            $dqeTotal  = (float) $project->dqeVersions->where('status', 'validated')->sum('total_ht');
            $budgetRef = $dqeTotal > 0 ? $dqeTotal : (float) $project->budget_amount;

            $engagement = (float) $project->budgetEntries->where('type', 'engagement')->sum('amount');
            $paiementBE = (float) $project->budgetEntries->where('type', 'paiement')->sum('amount');

            $invoices   = $project->invoices;
            $realise    = max($paiementBE, (float) $invoices->whereIn('status', ['validee', 'payee'])->sum('amount_ht'));
            $engage     = max($engagement,  (float) $invoices->where('status', 'soumise')->sum('amount_ht'));

            $rac  = max(0, $budgetRef - $engage - $realise);
            $cat  = $realise + $engage + $rac;
            $ecart = $budgetRef - $cat;

            return [
                'id'          => $project->id,
                'name'        => $project->name,
                'code'        => $project->code,
                'status'      => $project->status,
                'budget_ref'  => $budgetRef,
                'engage'      => $engage,
                'realise'     => $realise,
                'rac'         => $rac,
                'cat'         => $cat,
                'ecart'       => $ecart,
                'taux_realise'=> $budgetRef > 0 ? round($realise / $budgetRef * 100, 1) : 0,
                'taux_engage' => $budgetRef > 0 ? round($engage  / $budgetRef * 100, 1) : 0,
                'invoices'    => $invoices, // kept for activity feed below
            ];
        });

        // Totals
        $totals = [
            'budget_ref'  => $projectData->sum('budget_ref'),
            'engage'      => $projectData->sum('engage'),
            'realise'     => $projectData->sum('realise'),
            'rac'         => $projectData->sum('rac'),
            'cat'         => $projectData->sum('cat'),
            'ecart'       => $projectData->sum('ecart'),
        ];
        $bRef = $totals['budget_ref'];
        $totals['taux_realise'] = $bRef > 0 ? round($totals['realise'] / $bRef * 100, 1) : 0;
        $totals['taux_engage']  = $bRef > 0 ? round($totals['engage']  / $bRef * 100, 1) : 0;

        // General expenses (hors projet)
        $expenses = GeneralExpense::where('company_id', $companyId)
            ->with('creator:id,name', 'approver:id,name')
            ->orderByDesc('expense_date')
            ->get();

        // Unified activity feed (last 40 entries across invoices + expenses)
        $invoiceItems = $projectData->flatMap(function ($proj) {
            return collect($proj['invoices'])->map(fn($inv) => [
                'id'           => 'inv-' . $inv->id,
                'type'         => 'invoice',
                'date'         => $inv->invoice_date?->toDateString() ?? $inv->created_at->toDateString(),
                'reference'    => $inv->reference,
                'label'        => null,
                'amount'       => (float) $inv->amount_ht,
                'status'       => $inv->status,
                'category'     => $inv->category,
                'project_id'   => $proj['id'],
                'project_name' => $proj['name'],
                'project_code' => $proj['code'],
            ]);
        });

        $expenseItems = $expenses->map(fn($exp) => [
            'id'           => 'exp-' . $exp->id,
            'type'         => 'expense',
            'date'         => $exp->expense_date->toDateString(),
            'reference'    => null,
            'label'        => $exp->label,
            'amount'       => $exp->amount,
            'status'       => null,
            'category'     => $exp->category,
            'project_id'   => null,
            'project_name' => null,
            'project_code' => null,
        ]);

        $recentActivity = $invoiceItems->concat($expenseItems)
            ->sortByDesc('date')
            ->take(40)
            ->values();

        // Strip raw invoices from project data before returning
        $projectsOut = $projectData->map(fn($p) => collect($p)->except('invoices')->all())->values();

        return response()->json([
            'totals'          => $totals,
            'projects'        => $projectsOut,
            'recent_activity' => $recentActivity,
            'expenses'        => $expenses->values(),
        ]);
    }
}
