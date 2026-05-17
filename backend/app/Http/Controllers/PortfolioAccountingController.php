<?php

namespace App\Http\Controllers;

use App\Models\BudgetEntry;
use App\Models\GeneralExpense;
use App\Models\Invoice;
use App\Models\Project;
use App\Services\ProjectFinancialMetricsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PortfolioAccountingController extends Controller
{
    public function __construct(private ProjectFinancialMetricsService $metricsService) {}

    public function index(Request $request): JsonResponse
    {
        abort_unless(
            in_array($request->user()->role->name, ['direction', 'directeur-technique']),
            403,
            'Accès réservé à la direction.'
        );

        $companyId = $request->user()->company_id;

        $projects = Project::query()
            ->where('company_id', $companyId)
            ->whereIn('status', ['active', 'en_preparation'])
            ->with(['budgetEntries', 'invoices.supplier', 'dqeVersions'])
            ->get();


        $projectData = $projects->map(function (Project $project) {
            $metrics = $this->metricsService->compute($project);

            return [
                'id'          => $project->id,
                'name'        => $project->name,
                'code'        => $project->code,
                'status'      => $project->status,
                'budget_ref'  => $metrics['budget_ref'],
                'engage'      => $metrics['engage'],
                'realise'     => $metrics['realise'],
                'rac'         => $metrics['rac'],
                'cat'         => $metrics['cat'],
                'ecart'       => $metrics['ecart'],
                'taux_realise'=> $metrics['taux_realise'],
                'taux_engage' => $metrics['taux_engage'],
                'invoices'    => $project->invoices, // kept for activity feed below
            ];
        });

        // Totaux
        $totals = [
            'budget_ref'  => $projectData->sum('budget_ref'),
            'engage'      => $projectData->sum('engage'),
            'realise'     => $projectData->sum('realise'),
            'rac'         => $projectData->sum('rac'),
            'cat'         => $projectData->sum('cat'),
            'ecart'       => $projectData->sum('ecart'),
        ];
        $bRef = $totals['budget_ref'];
        $totals['taux_realise']       = $bRef > 0 ? round($totals['realise'] / $bRef * 100, 1) : 0;
        $totals['taux_engage']        = $bRef > 0 ? round($totals['engage']  / $bRef * 100, 1) : 0;
        $totals['realise_chantiers']  = $totals['realise']; // alias explicite — périmètre chantiers uniquement

        // General expenses (hors projet) — seules les approuvées intègrent les totaux de décaissement
        $expenses = GeneralExpense::where('company_id', $companyId)
            ->where('status', 'approuvee')
            ->with('creator:id,name', 'approver:id,name')
            ->orderByDesc('expense_date')
            ->get();

        $totals['depenses_generales'] = (float) $expenses->sum('amount');
        $totals['decaissements_total'] = $totals['realise'] + $totals['depenses_generales'];

        // Flux d'activité unifié (40 dernières entrées : factures + entrées budgétaires + dépenses)
        $invoiceItems = $projectData->flatMap(function ($proj) {
            return collect($proj['invoices'])->map(fn($inv) => [
                'id'           => 'inv-' . $inv->id,
                'source_id'    => $inv->id,
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

        $budgetEntryItems = $projects->flatMap(function ($project) {
            return $project->budgetEntries->where('type', 'paiement')->map(fn($be) => [
                'id'           => 'be-' . $be->id,
                'source_id'    => $be->id,
                'type'         => 'budget_entry',
                'date'         => $be->entry_date,
                'reference'    => null,
                'label'        => $be->label,
                'amount'       => (float) $be->amount,
                'status'       => $be->type,
                'category'     => $be->category,
                'project_id'   => $project->id,
                'project_name' => $project->name,
                'project_code' => $project->code,
            ]);
        });

        $expenseItems = $expenses->map(fn($exp) => [
            'id'           => 'exp-' . $exp->id,
            'source_id'    => $exp->id,
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

        $recentActivity = $invoiceItems->concat($budgetEntryItems)->concat($expenseItems)
            ->sortByDesc('date')
            ->take(40)
            ->values();

        // Retirer les factures brutes des données projet avant de retourner la réponse
        $projectsOut = $projectData->map(fn($p) => collect($p)->except('invoices')->all())->values();

        return response()->json([
            'totals'          => $totals,
            'projects'        => $projectsOut,
            'recent_activity' => $recentActivity,
            'expenses'        => $expenses->values(),
        ]);
    }

    public function activityDetail(Request $request, string $type, int $id): JsonResponse
    {
        abort_unless(
            in_array($request->user()->role->name, ['direction', 'directeur-technique']),
            403,
            'Accès réservé à la direction.'
        );

        $companyId = $request->user()->company_id;

        if ($type === 'budget_entry') {
            $entry = BudgetEntry::with([
                'project:id,name,code',
                'creator:id,name',
                'demandeBesoin.requester:id,name',
                'demandeBesoin.approver:id,name',
                'demandeBesoin.preparer:id,name',
                'demandeBesoin.recorder:id,name',
            ])->whereHas('project', fn($q) => $q->where('company_id', $companyId))
              ->findOrFail($id);

            $demande = $entry->demandeBesoin;

            return response()->json([
                'type'           => 'budget_entry',
                'id'             => $entry->id,
                'label'          => $entry->label,
                'amount'         => (float) $entry->amount,
                'category'       => $entry->category,
                'entry_date'     => $entry->entry_date,
                'note'           => $entry->note,
                'project'        => $entry->project,
                'creator'        => $entry->creator,
                'demande'        => $demande ? [
                    'id'             => $demande->id,
                    'title'          => $demande->title,
                    'description'    => $demande->description,
                    'urgency'        => $demande->urgency,
                    'estimated_cost' => $demande->estimated_cost,
                    'actual_cost'    => $demande->actual_cost,
                    'status'         => $demande->status,
                    'created_at'     => $demande->created_at,
                    'approved_at'    => $demande->approved_at,
                    'prepared_at'    => $demande->prepared_at,
                    'delivered_at'   => $demande->delivered_at,
                    'recorded_at'    => $demande->recorded_at,
                    'requester'      => $demande->requester,
                    'approver'       => $demande->approver,
                    'preparer'       => $demande->preparer,
                    'recorder'       => $demande->recorder,
                ] : null,
            ]);
        }

        if ($type === 'invoice') {
            $invoice = Invoice::with([
                'project:id,name,code',
                'supplier:id,name',
                'creator:id,name',
                'validator:id,name',
                'payer:id,name',
            ])->whereHas('project', fn($q) => $q->where('company_id', $companyId))
              ->findOrFail($id);

            return response()->json([
                'type'         => 'invoice',
                'id'           => $invoice->id,
                'reference'    => $invoice->reference,
                'amount'       => (float) $invoice->amount_ht,
                'amount_ttc'   => (float) $invoice->amount_ttc,
                'category'     => $invoice->category,
                'status'       => $invoice->status,
                'invoice_date' => $invoice->invoice_date,
                'due_date'     => $invoice->due_date,
                'paid_date'    => $invoice->paid_date,
                'validated_at' => $invoice->validated_at,
                'paid_at'      => $invoice->paid_at,
                'note'         => $invoice->note,
                'project'      => $invoice->project,
                'supplier'     => $invoice->supplier,
                'creator'      => $invoice->creator,
                'validator'    => $invoice->validator,
                'payer'        => $invoice->payer,
            ]);
        }

        if ($type === 'expense') {
            $expense = GeneralExpense::with(['creator:id,name', 'approver:id,name'])
                ->where('company_id', $companyId)
                ->findOrFail($id);

            return response()->json([
                'type'             => 'expense',
                'id'               => $expense->id,
                'label'            => $expense->label,
                'amount'           => (float) $expense->amount,
                'category'         => $expense->category,
                'status'           => $expense->status,
                'expense_date'     => $expense->expense_date,
                'paid_by'          => $expense->paid_by,
                'notes'            => $expense->notes,
                'approved_at'      => $expense->approved_at,
                'rejection_reason' => $expense->rejection_reason,
                'creator'          => $expense->creator,
                'approver'         => $expense->approver,
            ]);
        }

        abort(404, 'Type inconnu');
    }
}
