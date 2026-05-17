<?php

namespace App\Notifications;

use App\Models\SituationTravaux;
use App\Models\User;
use Illuminate\Notifications\Notification;

class SituationPendingCtReviewNotification extends Notification
{
    public function __construct(
        public readonly SituationTravaux $situation,
        public readonly User $submittedBy,
    ) {}

    public function via(object $notifiable): array { return ['database']; }

    public function toDatabase(object $notifiable): array
    {
        return [
            'type'          => 'situation_pending_ct_review',
            'situation_id'  => $this->situation->id,
            'situation_num' => $this->situation->numero,
            'periode'       => $this->situation->periode,
            'project_id'    => $this->situation->project_id,
            'project_name'  => $this->situation->project->name ?? null,
            'submitted_by'  => $this->submittedBy->name,
        ];
    }
}
