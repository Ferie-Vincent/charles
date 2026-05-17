<?php

namespace App\Policies;

use App\Models\Project;
use App\Models\ProjectWorker;
use App\Models\User;

class ProjectWorkerPolicy
{
    private function canManage(User $user, Project $project): bool
    {
        if ($user->company_id !== $project->company_id) {
            return false;
        }

        // direction + DT peuvent voir tous les ouvriers du projet
        if (in_array($user->role->name, ['direction', 'directeur-technique'])) {
            return true;
        }

        // chef-chantier + conducteur-travaux doivent être membres du projet
        if (in_array($user->role->name, ['chef-chantier', 'conducteur-travaux'])) {
            return $project->members()->where('user_id', $user->id)->exists();
        }

        return false;
    }

    public function viewAny(User $user, Project $project): bool
    {
        return $this->canManage($user, $project);
    }

    public function create(User $user, Project $project): bool
    {
        return $this->canManage($user, $project);
    }

    public function update(User $user, ProjectWorker $worker): bool
    {
        $project = $worker->project;
        return $this->canManage($user, $project);
    }

    public function delete(User $user, ProjectWorker $worker): bool
    {
        return $this->canManage($user, $worker->project);
    }
}
