<?php

namespace App\Notifications;

use App\Models\Project;
use Illuminate\Notifications\Notification;

class AvancementRetardNotification extends Notification
{
    public function __construct(
        public readonly Project $project,
        public readonly float $avancementReel,
        public readonly float $avancementCible,
        public readonly float $ecart,
    ) {}

    public function via(object $notifiable): array { return ['database']; }

    public function toDatabase(object $notifiable): array
    {
        return [
            'type'             => 'avancement_retard',
            'project_id'       => $this->project->id,
            'project_name'     => $this->project->name,
            'project_code'     => $this->project->code,
            'avancement_reel'  => $this->avancementReel,
            'avancement_cible' => $this->avancementCible,
            'ecart_pts'        => $this->ecart,
        ];
    }
}
