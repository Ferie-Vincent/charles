<?php

namespace App\Notifications;

use App\Models\SituationTravaux;
use App\Models\User;
use Illuminate\Notifications\Notification;

class SituationRejectedByDtNotification extends Notification
{
    public function __construct(
        public readonly SituationTravaux $situation,
        public readonly User $rejectedBy,
    ) {}

    public function via(object $notifiable): array { return ['database']; }

    public function toDatabase(object $notifiable): array
    {
        return [
            'type'           => 'situation_rejected_by_dt',
            'situation_id'   => $this->situation->id,
            'situation_num'  => $this->situation->numero,
            'periode'        => $this->situation->periode,
            'project_id'     => $this->situation->project_id,
            'project_name'   => $this->situation->project->name ?? null,
            'rejected_by'    => $this->rejectedBy->name,
            'comment'        => $this->situation->dt_rejection_comment,
        ];
    }
}
