<?php

namespace App\Observers;

use App\Models\Task;
use Illuminate\Support\Facades\DB;

class TaskObserver
{
    public function updated(Task $task): void
    {
        if ($task->wasChanged('status') && $task->status === 'done' && $task->alert_key) {
            // Permanent suppression: reappears_at = NULL
            DB::table('dismissed_alerts')
                ->updateOrInsert(
                    ['user_id' => $task->assigned_by, 'alert_key' => $task->alert_key],
                    ['dismissed_at' => now(), 'reappears_at' => null]
                );
        }
    }
}
