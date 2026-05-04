<?php

namespace App\Events;

use App\Models\DemandeBesoin;
use App\Models\User;

class DemandeBesoinApproved
{
    public function __construct(
        public readonly DemandeBesoin $demande,
        public readonly User $approver,
    ) {}
}
