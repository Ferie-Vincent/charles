<?php

namespace App\Services;

use App\Models\Project;

/**
 * Source canonique des métriques financières d'un chantier.
 *
 * Règles métier :
 *  - budget_ref  = total_ht de la dernière DQE validée, sinon budget_amount du projet
 *  - realise     = factures WHERE status='payee'          (décaissé réel, source d'audit)
 *  - engage      = BDC engagement entries + factures WHERE status='validee' (engagement ferme)
 *  - rac         = max(0, budget_ref - engage - realise)
 *  - cat         = realise + engage + rac                 (Coût à Terminaison)
 *  - ecart       = budget_ref - realise - engage          (positif=disponible, négatif=dépassement)
 *
 * Prérequis : le projet doit avoir les relations 'budgetEntries', 'invoices', 'dqeVersions' chargées.
 */
class ProjectFinancialMetricsService
{
    public function compute(Project $project): array
    {
        $lastDqe   = $project->dqeVersions
            ->where('status', 'validated')
            ->sortByDesc('version_number')
            ->first();

        $budgetRef = $lastDqe
            ? (float) $lastDqe->total_ht
            : (float) $project->budget_amount;

        $engagement      = (float) $project->budgetEntries->where('type', 'engagement')->sum('amount');
        $invoices        = $project->invoices;
        $realise         = (float) $invoices->where('status', 'payee')->sum('amount_ht');
        $invoicesValidee = (float) $invoices->where('status', 'validee')->sum('amount_ht');

        $engage = $engagement + $invoicesValidee;
        $rac    = max(0, $budgetRef - $engage - $realise);
        $cat    = $realise + $engage + $rac;
        $ecart  = $budgetRef - $realise - $engage;

        return [
            'budget_ref'    => $budgetRef,
            'realise'       => $realise,
            'engage'        => $engage,
            'rac'           => $rac,
            'cat'           => $cat,
            'ecart'         => $ecart,
            'taux_realise'  => $budgetRef > 0 ? round($realise / $budgetRef * 100, 1) : 0.0,
            'taux_engage'   => $budgetRef > 0 ? round($engage  / $budgetRef * 100, 1) : 0.0,
        ];
    }
}
