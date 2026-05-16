<?php

namespace App\Listeners;

use App\Events\TaskCompletedWithAlert;
use Illuminate\Support\Facades\DB;

class ArchiveAlertOnTaskCompletion
{
    public function handle(TaskCompletedWithAlert $event): void
    {
        DB::table('dismissed_alerts')->updateOrInsert(
            ['user_id' => $event->task->assigned_by, 'alert_key' => $event->task->alert_key],
            ['dismissed_at' => now(), 'reappears_at' => null],
        );
    }
}
