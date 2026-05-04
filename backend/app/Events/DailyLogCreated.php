<?php

namespace App\Events;

use App\Models\DailyLog;
use App\Models\Project;

class DailyLogCreated
{
    public function __construct(
        public readonly DailyLog $log,
        public readonly Project $project,
    ) {}
}
