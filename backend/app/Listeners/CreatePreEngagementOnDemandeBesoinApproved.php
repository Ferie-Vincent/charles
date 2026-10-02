<?php

namespace App\Listeners;

use App\Events\DemandeBesoinApproved;
use App\Models\BudgetEntry;

/**
 * Demande de besoin approuvée → pré-engagement prévisionnel (idempotent par demande).
 */
class CreatePreEngagementOnDemandeBesoinApproved
{
    private const CATEGORY_MAP = [
        'materiaux'      => 'Matériaux',
        'equipement'     => 'Équipements',
        'sous-traitance' => 'Sous-traitance',
        'main-oeuvre'    => "Main d'œuvre",
        'autre'          => 'Matériaux',
    ];

    public function handle(DemandeBesoinApproved $event): void
    {
        $demande = $event->demande;

        if (! $demande->project_id || ($demande->estimated_cost ?? 0) <= 0) {
            return;
        }

        $entry = BudgetEntry::upsertForSource(BudgetEntry::SOURCE_DEMANDE, $demande->id, 'previsionnel', [
            'project_id' => $demande->project_id,
            'created_by' => $event->approver->id,
            'category'   => self::CATEGORY_MAP[$demande->category] ?? 'Matériaux',
            'label'      => "Demande #{$demande->id} – {$demande->title}",
            'amount'     => $demande->estimated_cost,
            'entry_date' => now()->toDateString(),
            'note'       => "Pré-engagement automatique – approbation demande #{$demande->id}",
        ]);

        if ($demande->preengagement_entry_id !== $entry->id) {
            $demande->updateQuietly(['preengagement_entry_id' => $entry->id]);
        }
    }
}
