<?php

namespace App\Events;

use App\Models\DqeVersion;
use App\Models\User;

class DqeValidated
{
    public function __construct(
        public readonly DqeVersion $dqe,
        public readonly User $validator,
    ) {}
}
