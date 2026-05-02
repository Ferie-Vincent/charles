<?php

namespace App\Http\Controllers;

use App\Models\Project;
use Illuminate\Http\JsonResponse;

class ProjectAccountingController extends Controller
{
    public function show(Project $project): JsonResponse
    {
        $this->authorize('view', $project);

        $project->load(['budgetEntries', 'invoices.supplier', 'suppliers', 'dqeVersions.lines']);

        // Budget de référence : DQE validé ou budget_amount du projet
        $dqeTotal = $project->dqeVersions
            ->where('status', 'validated')
            ->sum('total_ht');

        $budgetRef = $dqeTotal > 0 ? $dqeTotal : (float) $project->budget_amount;

        // Depuis budget_entries (ancienne méthode)
        $previsionnel = (float) $project->budgetEntries->where('type', 'previsionnel')->sum('amount');
        $engagement   = (float) $project->budgetEntries->where('type', 'engagement')->sum('amount');
        $paiementBE   = (float) $project->budgetEntries->where('type', 'paiement')->sum('amount');

        // Depuis factures (nouvelle méthode)
        $factures        = $project->invoices;
        $realiseFactures = (float) $factures->whereIn('status', ['validee', 'payee'])->sum('amount_ht');
        $engageFact      = (float) $factures->where('status', 'soumise')->sum('amount_ht');

        // Métriques consolidées
        $realise         = max($paiementBE, $realiseFactures); // take the higher source
        $engage          = max($engagement, $engageFact);
        $rac             = max(0, $budgetRef - $engage - $realise);
        $cat             = $realise + $engage + $rac; // Coût à Terminaison
        $ecart           = $budgetRef - $cat;
        $tauxRealisation = $budgetRef > 0 ? round($realise / $budgetRef * 100, 1) : 0;
        $tauxEngagement  = $budgetRef > 0 ? round($engage / $budgetRef * 100, 1) : 0;

        // Breakdown par catégorie (depuis factures validées)
        $byCategory = $factures
            ->whereIn('status', ['validee', 'payee', 'soumise'])
            ->groupBy('category')
            ->map(fn($grp) => [
                'realise' => (float) $grp->whereIn('status', ['validee', 'payee'])->sum('amount_ht'),
                'engage'  => (float) $grp->where('status', 'soumise')->sum('amount_ht'),
                'count'   => $grp->count(),
            ])
            ->sortByDesc(fn($v) => $v['realise'] + $v['engage'])
            ->values();

        // Suppliers avec totaux factures
        $suppliersData = $project->suppliers->map(fn($s) => [
            'id'              => $s->id,
            'name'            => $s->name,
            'category'        => $s->category,
            'contract_amount' => $s->contract_amount,
            'billed'          => (float) $factures->where('supplier_id', $s->id)->sum('amount_ht'),
            'paid'            => (float) $factures->where('supplier_id', $s->id)->whereIn('status', ['payee'])->sum('amount_ht'),
            'contact_name'    => $s->contact_name,
            'phone'           => $s->phone,
            'email'           => $s->email,
        ]);

        // Échéances à venir (factures dues dans 30j)
        $upcoming = $factures
            ->whereNotIn('status', ['payee', 'disputee'])
            ->where('due_date', '!=', null)
            ->filter(fn($inv) => $inv->due_date && $inv->due_date->diffInDays(now(), false) < 30)
            ->sortBy('due_date')
            ->values();

        return response()->json([
            'budget_ref'       => $budgetRef,
            'dqe_total'        => $dqeTotal,
            'previsionnel'     => $previsionnel,
            'engage'           => $engage,
            'realise'          => $realise,
            'rac'              => $rac,
            'cat'              => $cat,
            'ecart'            => $ecart,
            'taux_realisation' => $tauxRealisation,
            'taux_engagement'  => $tauxEngagement,
            'by_category'      => $byCategory,
            'suppliers'        => $suppliersData->values(),
            'invoices'         => $factures->sortByDesc('invoice_date')->values(),
            'upcoming'         => $upcoming,
        ]);
    }
}
