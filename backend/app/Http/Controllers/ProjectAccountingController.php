<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Services\ProjectFinancialMetricsService;
use Illuminate\Http\JsonResponse;

class ProjectAccountingController extends Controller
{
    public function __construct(private ProjectFinancialMetricsService $metricsService) {}

    public function show(Project $project): JsonResponse
    {
        $this->authorize('view', $project);

        $project->load(['budgetEntries', 'invoices.supplier', 'suppliers', 'dqeVersions.lines']);

        $metrics = $this->metricsService->compute($project);

        $lastValidatedDqe = $project->dqeVersions
            ->where('status', 'validated')
            ->sortByDesc('version_number')
            ->first();
        $dqeTotal     = $lastValidatedDqe ? (float) $lastValidatedDqe->total_ht : 0.0;
        $previsionnel = (float) $project->budgetEntries->where('type', 'previsionnel')->sum('amount');

        $factures = $project->invoices;

        $byCategory = $factures
            ->whereIn('status', ['payee', 'validee'])
            ->groupBy('category')
            ->map(fn($grp) => [
                'realise' => (float) $grp->where('status', 'payee')->sum('amount_ht'),
                'engage'  => (float) $grp->where('status', 'validee')->sum('amount_ht'),
                'count'   => $grp->count(),
            ])
            ->sortByDesc(fn($v) => $v['realise'] + $v['engage'])
            ->values();

        $suppliersData = $project->suppliers->map(fn($s) => [
            'id'              => $s->id,
            'name'            => $s->name,
            'category'        => $s->category,
            'contract_amount' => $s->contract_amount,
            'billed'          => (float) $factures->where('supplier_id', $s->id)->sum('amount_ht'),
            'paid'            => (float) $factures->where('supplier_id', $s->id)->where('status', 'payee')->sum('amount_ht'),
            'contact_name'    => $s->contact_name,
            'phone'           => $s->phone,
            'email'           => $s->email,
        ]);

        $upcoming = $factures
            ->whereNotIn('status', ['payee', 'disputee'])
            ->filter(fn($inv) => $inv->due_date && $inv->due_date->isFuture() && $inv->due_date->diffInDays(now()) <= 30)
            ->sortBy('due_date')
            ->values();

        return response()->json([
            'budget_ref'       => $metrics['budget_ref'],
            'dqe_total'        => $dqeTotal,
            'previsionnel'     => $previsionnel,
            'engage'           => $metrics['engage'],
            'realise'          => $metrics['realise'],
            'rac'              => $metrics['rac'],
            'cat'              => $metrics['cat'],
            'ecart'            => $metrics['ecart'],
            'taux_realisation' => $metrics['taux_realise'],
            'taux_engagement'  => $metrics['taux_engage'],
            'by_category'      => $byCategory,
            'suppliers'        => $suppliersData->values(),
            'invoices'         => $factures->sortByDesc('invoice_date')->values(),
            'upcoming'         => $upcoming,
        ]);
    }
}
