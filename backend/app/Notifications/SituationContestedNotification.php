<?php

namespace App\Notifications;

use App\Models\SituationTravaux;
use App\Models\User;
use Illuminate\Notifications\Notification;

class SituationContestedNotification extends Notification
{
    public function __construct(
        public readonly SituationTravaux $situation,
        public readonly User $contestedBy,
    ) {}

    public function via(object $notifiable): array { return ['database']; }

    public function toDatabase(object $notifiable): array
    {
        return [
            'type'          => 'situation_contested',
            'situation_id'  => $this->situation->id,
            'situation_num' => $this->situation->numero,
            'periode'       => $this->situation->periode,
            'project_id'    => $this->situation->project_id,
            'project_name'  => $this->situation->project->name ?? null,
            'contested_by'  => $this->contestedBy->name,
            'reason'        => $this->situation->contest_reason,
        ];
    }
}
