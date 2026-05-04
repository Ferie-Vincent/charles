<?php

namespace App\Listeners;

use App\Events\BdcCancelled;
use App\Models\BudgetEntry;

class ReverseEngagementOnBdcCancelled
{
    public function handle(BdcCancelled $event): void
    {
        if (! $event->wasApproved) {
            return;
        }

        $bdc = $event->bdc;

        if ($bdc->engagement_entry_id) {
            BudgetEntry::find($bdc->engagement_entry_id)?->delete();
            $bdc->updateQuietly(['engagement_entry_id' => null]);
        }
    }
}
