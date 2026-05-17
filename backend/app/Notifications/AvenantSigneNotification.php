<?php

namespace App\Notifications;

use App\Models\Avenant;
use Illuminate\Notifications\Notification;

class AvenantSigneNotification extends Notification
{
    public function __construct(private readonly Avenant $avenant) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toDatabase(object $notifiable): array
    {
        return [
            'type'        => 'avenant_signe',
            'avenant_id'  => $this->avenant->id,
            'numero'      => $this->avenant->numero,
            'objet'       => $this->avenant->objet,
            'montant_ht'  => $this->avenant->montant_ht,
            'project_id'  => $this->avenant->project_id,
            'project_name'=> $this->avenant->project?->name,
            'project_code'=> $this->avenant->project?->code,
        ];
    }
}
