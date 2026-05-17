<?php

namespace App\Notifications;

use App\Models\Project;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class RetenueGarantieLiberable extends Notification
{
    use Queueable;

    public function __construct(
        private readonly Project $project,
        private readonly float $montant,
        private readonly string $dateReception,
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type'           => 'retenue_garantie_liberable',
            'project_id'     => $this->project->id,
            'project_code'   => $this->project->code,
            'project_name'   => $this->project->name,
            'montant'        => $this->montant,
            'date_reception' => $this->dateReception,
            'message'        => "La retenue de garantie de " . number_format($this->montant, 0, ',', ' ') . " XOF est libérable (1 an après réception prov. du {$this->dateReception}).",
        ];
    }
}
