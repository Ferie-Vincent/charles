<?php

namespace App\Notifications;

use Illuminate\Notifications\Notification;
use Illuminate\Support\Collection;

class MineurIncidentDigestNotification extends Notification
{
    public function __construct(
        public readonly Collection $incidents,
        public readonly string $date,
    ) {}

    public function via(object $notifiable): array { return ['database']; }

    public function toDatabase(object $notifiable): array
    {
        $summary = $this->incidents->map(fn($i) => [
            'id'           => $i->id,
            'type'         => $i->type,
            'project_name' => $i->project->name ?? null,
            'project_code' => $i->project->code ?? null,
            'reporter'     => $i->reporter->name ?? null,
        ])->values()->all();

        return [
            'type'       => 'incident_mineur_digest',
            'date'       => $this->date,
            'count'      => $this->incidents->count(),
            'incidents'  => $summary,
        ];
    }
}
