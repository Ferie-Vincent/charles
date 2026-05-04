<?php

namespace App\Listeners;

use App\Events\BdcApproved;
use App\Models\BudgetEntry;

class CreateBudgetEngagementOnBdcApproved
{
    public function handle(BdcApproved $event): void
    {
        $bdc = $event->bdc;

        if (! $bdc->project_id || $bdc->total_amount <= 0) {
            return;
        }

        $supplierName = $bdc->supplier?->name ?? $bdc->supplier_id ?? 'Fournisseur inconnu';

        $entry = BudgetEntry::create([
            'project_id'  => $bdc->project_id,
            'created_by'  => $event->approver->id,
            'type'        => 'engagement',
            'category'    => 'Matériaux',
            'label'       => "BDC #{$bdc->reference} – {$supplierName}",
            'amount'      => $bdc->total_amount,
            'entry_date'  => now()->toDateString(),
            'note'        => "Engagement automatique – approbation BDC #{$bdc->reference}",
        ]);

        $bdc->updateQuietly(['engagement_entry_id' => $entry->id]);
    }
}
