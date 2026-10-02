<?php

namespace App\Listeners;

use App\Events\BdcApproved;
use App\Models\BudgetEntry;

/**
 * Approbation BDC → engagement budgétaire.
 * Idempotent : recalcul convergent via BudgetEntry::syncBdcEngagement (clé unique source).
 */
class CreateBudgetEngagementOnBdcApproved
{
    public function handle(BdcApproved $event): void
    {
        BudgetEntry::syncBdcEngagement($event->bdc, $event->approver);
    }
}
