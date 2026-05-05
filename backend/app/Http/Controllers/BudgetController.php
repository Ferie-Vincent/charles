<?php

namespace App\Http\Controllers;

use App\Models\BudgetEntry;
use App\Models\Project;
use App\Services\ProjectFinancialMetricsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class BudgetController extends Controller
{
    public function index(Project $project): JsonResponse
    {
        $this->authorize('view', $project);

        $project->load(['budgetEntries', 'invoices', 'dqeVersions']);
        $entries = $project->budgetEntries->sortBy('entry_date');

        $totals = [
            'previsionnel' => $entries->where('type', 'previsionnel')->sum('amount'),
            'engagement'   => $entries->where('type', 'engagement')->sum('amount'),
            'paiement'     => $entries->where('type', 'paiement')->sum('amount'),
        ];
        $totals['taux_engagement'] = $totals['previsionnel'] > 0
            ? round(($totals['engagement'] / $totals['previsionnel']) * 100, 1)
            : 0;

        // Source canonique : mêmes métriques que ProjectAccountingController
        $canonical            = app(ProjectFinancialMetricsService::class)->compute($project);
        $totals['realise']    = $canonical['realise'];     // factures payées uniquement
        $totals['solde']      = $canonical['budget_ref'] - $canonical['realise'] - $canonical['engage'];

        // 90-day monthly buckets from today
        $buckets = $this->build90jBuckets($entries);

        return response()->json([
            'entries' => $entries,
            'totals'  => $totals,
            'chart'   => $buckets,
        ]);
    }

    public function store(Request $request, Project $project): JsonResponse
    {
        $this->authorize('manageFinances', $project);

        if ($project->status === 'completed') {
            abort_unless(
                in_array($request->user()->role->name, ['direction', 'comptable']),
                403,
                'Chantier terminé — seuls direction et comptable peuvent saisir des régularisations.'
            );
        }

        $data = $request->validate([
            'type'       => 'required|in:previsionnel,engagement,paiement',
            'category'   => 'required|string|max:100',
            'label'      => 'required|string|max:255',
            'amount'     => 'required|numeric|min:0',
            'entry_date' => 'required|date',
            'note'       => 'nullable|string|max:500',
        ]);

        $entry = $project->budgetEntries()->create([
            ...$data,
            'created_by' => $request->user()->id,
        ]);

        return response()->json($entry, 201);
    }

    public function destroy(Project $project, BudgetEntry $budgetEntry): Response
    {
        $this->authorize('manageFinances', $project);
        abort_if($budgetEntry->project_id !== $project->id, 404);

        $linkedDemande = \App\Models\DemandeBesoin::where('budget_entry_id', $budgetEntry->id)->exists();
        abort_if($linkedDemande, 422, 'Cette entrée budgétaire est liée à une demande de besoin. Supprimez la demande d\'abord.');

        $budgetEntry->delete();
        return response()->noContent();
    }

    private function build90jBuckets($entries): array
    {
        $today = now()->startOfDay();
        $end   = $today->copy()->addDays(90);

        // Build 3 monthly buckets
        $buckets = [];
        for ($i = 0; $i < 3; $i++) {
            $from = $today->copy()->addMonths($i)->startOfMonth();
            $to   = $from->copy()->endOfMonth();
            // clamp to today..+90d
            $from = $from->lt($today) ? $today : $from;
            $to   = $to->gt($end) ? $end : $to;

            $label = $from->locale('fr')->isoFormat('MMM YYYY');

            $buckets[] = [
                'month'        => $label,
                'previsionnel' => (float) $entries->where('type', 'previsionnel')
                    ->whereBetween('entry_date', [$from, $to])->sum('amount'),
                'engagement'   => (float) $entries->where('type', 'engagement')
                    ->whereBetween('entry_date', [$from, $to])->sum('amount'),
                'paiement'     => (float) $entries->where('type', 'paiement')
                    ->whereBetween('entry_date', [$from, $to])->sum('amount'),
            ];
        }

        return $buckets;
    }
}
