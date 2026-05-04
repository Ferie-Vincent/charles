<?php

namespace App\Listeners;

use App\Events\DailyLogCreated;
use App\Models\Incident;

class CreateIncidentFromDailyLog
{
    public function handle(DailyLogCreated $event): void
    {
        $log = $event->log;

        if (! $log->has_incident) {
            return;
        }

        // Avoid duplicate if an incident already exists for this project on this date.
        $exists = Incident::where('project_id', $log->project_id)
            ->whereDate('occurred_at', $log->log_date)
            ->where('reported_by', $log->user_id)
            ->exists();

        if ($exists) {
            return;
        }

        Incident::create([
            'project_id'  => $log->project_id,
            'reported_by' => $log->user_id,
            'type'        => $log->incident_type ?? 'Autre',
            'severity'    => 'mineur',
            'status'      => 'ouvert',
            'occurred_at' => $log->log_date->startOfDay(),
            'description' => "Incident signalé dans le journal du {$log->log_date->format('d/m/Y')}. À compléter.",
        ]);
    }
}
