<?php

namespace App\Events;

use App\Models\PurchaseOrder;
use App\Models\User;

class BdcApproved
{
    public function __construct(
        public readonly PurchaseOrder $bdc,
        public readonly User $approver,
    ) {}
}
