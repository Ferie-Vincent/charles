<?php

namespace App\Notifications;

use App\Models\Project;
use Illuminate\Notifications\Notification;

class BudgetDepaseNotification extends Notification
{
    public function __construct(
        public readonly Project $project,
        public readonly float $realise,
        public readonly float $budgetRef,
        public readonly float $depassementPct,
    ) {}

    public function via(object $notifiable): array { return ['database']; }

    public function toDatabase(object $notifiable): array
    {
        return [
            'type'             => 'budget_depasse',
            'project_id'       => $this->project->id,
            'project_name'     => $this->project->name,
            'project_code'     => $this->project->code,
            'realise'          => $this->realise,
            'budget_ref'       => $this->budgetRef,
            'depassement_pct'  => $this->depassementPct,
        ];
    }
}
