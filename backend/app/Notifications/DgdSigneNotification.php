<?php

namespace App\Notifications;

use App\Models\DecompteGeneralDefinitif;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class DgdSigneNotification extends Notification
{
    use Queueable;

    public function __construct(private readonly DecompteGeneralDefinitif $dgd) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type'         => 'dgd_signe',
            'project_id'   => $this->dgd->project_id,
            'project_code' => $this->dgd->project?->code,
            'project_name' => $this->dgd->project?->name,
            'solde_final'  => $this->dgd->solde_final,
            'message'      => "DGD signé MOA — chantier {$this->dgd->project?->code} clôturé financièrement. Solde final : " . number_format($this->dgd->solde_final, 0, ',', ' ') . " XOF.",
        ];
    }
}
