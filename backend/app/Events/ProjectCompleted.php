<?php

namespace App\Events;

use App\Models\Project;
use App\Models\User;

class ProjectCompleted
{
    public function __construct(
        public readonly Project $project,
        public readonly User $by,
    ) {}
}
