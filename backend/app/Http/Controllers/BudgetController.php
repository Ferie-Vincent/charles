<?php

namespace App\Http\Controllers;

use App\Models\BudgetEntry;
use App\Models\Project;
use App\Models\SituationTravaux;
use App\Services\ProjectFinancialMetricsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class BudgetController extends Controller
{
    public function index(Project $project): JsonResponse
    {
        $this->authorize('view', $project);

        $project->load(['budgetEntries.situationTravaux:id,numero', 'invoices', 'dqeVersions']);
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

        // Créances attendues : situations engagées (≥ soumise) non encore payées (Mary — trésorerie entrante)
        $creances = $this->expectedReceivables($project);

        // Tranches mensuelles sur 90 jours à partir d'aujourd'hui — décaissements ET encaissements
        $buckets = $this->build90jBuckets($entries, $creances);

        $totals['creances_en_attente'] = round($creances->sum('amount'), 2);
        $totals['delai_paiement_jours'] = $project->effective_delai_paiement_jours;

        // Paiements manuels sans lien situation — saisie comptable non traçable
        $orphanPayments = $project->budgetEntries()
            ->where('type', 'paiement')
            ->whereNull('situation_travaux_id')
            ->get(['id', 'label', 'amount', 'entry_date', 'category']);

        return response()->json([
            'entries'         => $entries,
            'totals'          => $totals,
            'chart'           => $buckets,
            'orphan_payments' => $orphanPayments,
            'creances'        => $creances->values(),
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

    /**
     * Créances attendues du MOA : une situation de travaux ≥ soumise et non payée est de l'argent
     * dû. Date d'encaissement estimée = (service fait ?? validation ?? soumission) + délai de
     * paiement du chantier. Sans cela la trésorerie 90 j ne voit que les sorties.
     *
     * @return \Illuminate\Support\Collection<int, array{id:int, numero:string, periode:string, status:string, amount:float, expected_date:string, overdue:bool, basis:string}>
     */
    private function expectedReceivables(Project $project): \Illuminate\Support\Collection
    {
        $delai = $project->effective_delai_paiement_jours;

        return SituationTravaux::where('project_id', $project->id)
            ->whereIn('status', ['soumise', 'validee_moe'])
            ->orderBy('created_at')
            ->get()
            ->map(function (SituationTravaux $s) use ($delai) {
                [$basisDate, $basis] = match (true) {
                    $s->service_fait_at !== null => [$s->service_fait_at, 'service_fait'],
                    $s->validated_at !== null    => [$s->validated_at, 'validation_moe'],
                    $s->submitted_at !== null    => [$s->submitted_at, 'soumission'],
                    default                      => [$s->created_at, 'creation'],
                };
                $expected = \Carbon\Carbon::parse($basisDate)->addDays($delai)->startOfDay();

                return [
                    'id'            => $s->id,
                    'numero'        => $s->numero,
                    'periode'       => $s->periode,
                    'status'        => $s->status,
                    'amount'        => (float) $s->net_a_payer,
                    'expected_date' => $expected->toDateString(),
                    'overdue'       => $expected->lt(now()->startOfDay()),
                    'basis'         => $basis,
                ];
            });
    }

    private function build90jBuckets($entries, \Illuminate\Support\Collection $creances): array
    {
        $today = now()->startOfDay();
        $end   = $today->copy()->addDays(90);

        // Construire 3 tranches mensuelles
        $buckets = [];
        for ($i = 0; $i < 3; $i++) {
            $from = $today->copy()->addMonths($i)->startOfMonth();
            $to   = $from->copy()->endOfMonth();
            // borner à aujourd'hui..+90j
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
                // Encaissements attendus : créances en retard comptées dans la première tranche
                'encaissement' => (float) $creances->filter(function ($c) use ($from, $to, $i) {
                    $d = \Carbon\Carbon::parse($c['expected_date']);
                    return ($i === 0 && $d->lt($from)) || $d->between($from, $to);
                })->sum('amount'),
            ];
        }

        return $buckets;
    }
}
