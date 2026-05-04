<?php

namespace App\Listeners;

use App\Events\DailyLogCreated;
use App\Models\ProjectActivity;

class UpdateProjectProgressOnDailyLog
{
    public function handle(DailyLogCreated $event): void
    {
        $log     = $event->log;
        $project = $event->project;

        $progress = (int) $log->progress_percent;
        $project->updateQuietly(['current_progress' => $progress]);

        $target = (int) ($project->target_progress ?? 0);

        if ($target > 0 && $progress < $target) {
            ProjectActivity::create([
                'project_id'  => $project->id,
                'user_id'     => $log->user_id,
                'type'        => 'retard_detecte',
                'description' => "Avancement réel {$progress}% < cible {$target}% (journal du {$log->log_date->format('d/m/Y')})",
                'metadata'    => [
                    'progress_reel'  => $progress,
                    'progress_cible' => $target,
                    'ecart'          => $target - $progress,
                    'log_date'       => $log->log_date->toDateString(),
                ],
            ]);
        }
    }
}
