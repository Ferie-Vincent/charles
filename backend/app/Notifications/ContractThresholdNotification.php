<?php

namespace App\Notifications;

use App\Models\Project;
use App\Models\SituationTravaux;
use Illuminate\Notifications\Notification;

class ContractThresholdNotification extends Notification
{
    public function __construct(
        public readonly SituationTravaux $situation,
        public readonly Project $project,
        public readonly float $ratio,
    ) {}

    public function via(object $notifiable): array { return ['database']; }

    public function toDatabase(object $notifiable): array
    {
        return [
            'type'           => 'contract_threshold_80pct',
            'situation_id'   => $this->situation->id,
            'situation_num'  => $this->situation->numero,
            'project_id'     => $this->project->id,
            'project_name'   => $this->project->name,
            'project_code'   => $this->project->code,
            'ratio_pct'      => round($this->ratio * 100, 1),
            'montant_marche' => $this->project->montant_marche,
        ];
    }
}
