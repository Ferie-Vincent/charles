<?php

namespace App\Observers;

use App\Events\TaskCompletedWithAlert;
use App\Models\Task;

class TaskObserver
{
    public function updated(Task $task): void
    {
        if ($task->wasChanged('status') && $task->status === 'done' && $task->alert_key) {
            event(new TaskCompletedWithAlert($task));
        }
    }
}
