<?php

namespace App\Notifications;

use App\Models\Incident;
use App\Models\Project;
use Illuminate\Notifications\Notification;

class IncidentSevereNotification extends Notification
{
    public function __construct(
        private readonly Incident $incident,
        private readonly Project $project,
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toDatabase(object $notifiable): array
    {
        return [
            'type'         => 'incident_severe',
            'incident_id'  => $this->incident->id,
            'severity'     => $this->incident->severity,
            'incident_type'=> $this->incident->type,
            'project_id'   => $this->project->id,
            'project_name' => $this->project->name,
            'project_code' => $this->project->code,
            'location'     => $this->incident->location,
            'reporter_name'=> $this->incident->reporter?->name,
            'occurred_at'  => $this->incident->occurred_at,
        ];
    }
}
