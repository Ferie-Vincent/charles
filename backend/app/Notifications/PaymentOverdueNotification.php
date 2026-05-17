<?php

namespace App\Notifications;

use App\Models\SituationTravaux;
use Illuminate\Notifications\Notification;

class PaymentOverdueNotification extends Notification
{
    public function __construct(public readonly SituationTravaux $situation) {}

    public function via(object $notifiable): array { return ['database']; }

    public function toDatabase(object $notifiable): array
    {
        $days = (int) $this->situation->validated_at?->diffInDays(now());
        return [
            'type'           => 'payment_overdue',
            'situation_id'   => $this->situation->id,
            'situation_num'  => $this->situation->numero,
            'periode'        => $this->situation->periode,
            'project_id'     => $this->situation->project_id,
            'project_name'   => $this->situation->project->name ?? null,
            'project_code'   => $this->situation->project->code ?? null,
            'net_a_payer'    => $this->situation->net_a_payer,
            'validated_at'   => $this->situation->validated_at?->toDateString(),
            'days_overdue'   => $days,
        ];
    }
}
