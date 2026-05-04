<?php

namespace App\Listeners;

use App\Events\DqeValidated;
use App\Models\ProjectActivity;

class UpdateProjectBudgetOnDqeValidated
{
    public function handle(DqeValidated $event): void
    {
        $dqe     = $event->dqe;
        $project = $dqe->project;

        if (! $project || ($dqe->total_ht ?? 0) <= 0) {
            return;
        }

        $project->updateQuietly(['budget_amount' => $dqe->total_ht]);

        ProjectActivity::create([
            'project_id'  => $project->id,
            'user_id'     => $event->validator->id,
            'type'        => 'dqe_valide',
            'description' => "DQE v{$dqe->version_number} « {$dqe->name} » validé – budget référence mis à jour : " . number_format($dqe->total_ht, 0, ',', ' ') . ' XOF HT',
            'metadata'    => [
                'dqe_id'         => $dqe->id,
                'version_number' => $dqe->version_number,
                'total_ht'       => $dqe->total_ht,
            ],
        ]);
    }
}
