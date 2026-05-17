<?php

namespace App\Notifications;

use App\Models\SituationTravaux;
use App\Models\User;
use Illuminate\Notifications\Notification;

class SituationValidatedNotification extends Notification
{
    public function __construct(
        private readonly SituationTravaux $situation,
        private readonly User $validator,
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toDatabase(object $notifiable): array
    {
        return [
            'type'         => 'situation_validated',
            'situation_id' => $this->situation->id,
            'numero'       => $this->situation->numero,
            'periode'      => $this->situation->periode,
            'project_id'   => $this->situation->project_id,
            'project_name' => $this->situation->project?->name,
            'project_code' => $this->situation->project?->code,
            'validator'    => $this->validator->name,
            'validated_at' => $this->situation->validated_at?->toIso8601String(),
        ];
    }
}
