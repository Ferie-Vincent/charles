<?php

namespace App\Notifications;

use App\Models\SituationTravaux;
use Illuminate\Notifications\Notification;

class ContestationDelayNotification extends Notification
{
    public function __construct(
        public readonly SituationTravaux $situation,
        public readonly int $daysWaiting,
    ) {}

    public function via(object $notifiable): array { return ['database']; }

    public function toDatabase(object $notifiable): array
    {
        return [
            'type'          => 'contestation_delay',
            'situation_id'  => $this->situation->id,
            'situation_num' => $this->situation->numero,
            'periode'       => $this->situation->periode,
            'project_id'    => $this->situation->project_id,
            'project_name'  => $this->situation->project->name ?? null,
            'days_waiting'  => $this->daysWaiting,
        ];
    }
}
