<?php

namespace App\Listeners;

use App\Events\BdcRejected;
use App\Models\User;
use App\Notifications\BdcStatusChangedNotification;

class NotifyRequesterOnBdcRejected
{
    public function handle(BdcRejected $event): void
    {
        $bdc = $event->bdc;

        if (! $bdc->requested_by) {
            return;
        }

        $requester = User::find($bdc->requested_by);
        $requester?->notify(new BdcStatusChangedNotification(
            $bdc,
            'rejete',
            $event->rejectedBy,
            $bdc->rejection_reason,
        ));
    }
}
