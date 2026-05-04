<?php

namespace App\Listeners;

use App\Events\DemandeBesoinApproved;
use App\Models\BudgetEntry;

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

        $entry = BudgetEntry::create([
            'project_id'  => $demande->project_id,
            'created_by'  => $event->approver->id,
            'type'        => 'previsionnel',
            'category'    => self::CATEGORY_MAP[$demande->category] ?? 'Matériaux',
            'label'       => "Demande #{$demande->id} – {$demande->title}",
            'amount'      => $demande->estimated_cost,
            'entry_date'  => now()->toDateString(),
            'note'        => "Pré-engagement automatique – approbation demande #{$demande->id}",
        ]);

        $demande->updateQuietly(['preengagement_entry_id' => $entry->id]);
    }
}
