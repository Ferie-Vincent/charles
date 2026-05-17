<?php

namespace App\Listeners;

use App\Events\BdcApproved;
use App\Models\User;
use App\Notifications\BdcStatusChangedNotification;

class NotifyRequesterOnBdcApproved
{
    public function handle(BdcApproved $event): void
    {
        $bdc = $event->bdc;

        if (! $bdc->requested_by || $bdc->requested_by === $event->approver->id) {
            return;
        }

        $requester = User::find($bdc->requested_by);
        $requester?->notify(new BdcStatusChangedNotification($bdc, 'approuve', $event->approver));
    }
}
