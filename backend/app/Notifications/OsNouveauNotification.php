<?php

namespace App\Notifications;

use App\Models\OrdreDeService;
use Illuminate\Notifications\Notification;

class OsNouveauNotification extends Notification
{
    public function __construct(public readonly OrdreDeService $os) {}

    public function via(object $notifiable): array { return ['database']; }

    public function toDatabase(object $notifiable): array
    {
        return [
            'type'         => 'os_nouveau',
            'os_id'        => $this->os->id,
            'os_type'      => $this->os->type,
            'objet'        => $this->os->objet,
            'date_os'      => $this->os->date_os,
            'project_id'   => $this->os->project_id,
            'project_name' => $this->os->project->name ?? null,
            'project_code' => $this->os->project->code ?? null,
        ];
    }
}
