<?php

namespace App\Listeners;

use App\Events\BdcCancelled;
use App\Models\BudgetEntry;

/**
 * BDC annulé → plus d'engagement (sync supprime l'écriture car statut non actif).
 */
class ReverseEngagementOnBdcCancelled
{
    public function handle(BdcCancelled $event): void
    {
        BudgetEntry::syncBdcEngagement($event->bdc, $event->by);
    }
}
