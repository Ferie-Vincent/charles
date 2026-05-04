<?php

namespace App\Events;

use App\Models\PurchaseOrder;
use App\Models\User;

class BdcCancelled
{
    public function __construct(
        public readonly PurchaseOrder $bdc,
        public readonly User $by,
        public readonly bool $wasApproved,
    ) {}
}
