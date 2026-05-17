<?php

namespace App\Events;

use App\Models\PurchaseOrder;
use App\Models\User;

class BdcRejected
{
    public function __construct(
        public readonly PurchaseOrder $bdc,
        public readonly User $rejectedBy,
    ) {}
}
