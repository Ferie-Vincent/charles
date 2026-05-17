<?php

namespace App\Notifications;

use App\Models\SituationTravaux;
use App\Models\User;
use Illuminate\Notifications\Notification;

class SituationPaidNotification extends Notification
{
    public function __construct(
        private readonly SituationTravaux $situation,
        private readonly User $paidBy,
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toDatabase(object $notifiable): array
    {
        return [
            'type'         => 'situation_paid',
            'situation_id' => $this->situation->id,
            'numero'       => $this->situation->numero,
            'periode'      => $this->situation->periode,
            'project_id'   => $this->situation->project_id,
            'project_name' => $this->situation->project?->name,
            'project_code' => $this->situation->project?->code,
            'net_a_payer'  => $this->situation->net_a_payer,
            'paid_by'      => $this->paidBy->name,
            'date_paiement'=> $this->situation->date_paiement,
        ];
    }
}
