<?php

namespace App\Events;

use App\Models\Task;

class TaskCompletedWithAlert
{
    public function __construct(
        public readonly Task $task,
    ) {}
}
