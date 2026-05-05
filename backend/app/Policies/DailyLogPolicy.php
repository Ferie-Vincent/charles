<?php

namespace App\Policies;

use App\Models\DailyLog;
use App\Models\Project;
use App\Models\User;

class DailyLogPolicy
{
    public function create(User $user, Project $project): bool
    {
        if ($user->company_id !== $project->company_id) return false;
        if ($project->status === 'completed') return false;

        $terrainRoles = ['conducteur-travaux', 'chef-chantier', 'direction', 'directeur-technique'];
        if (!in_array($user->role->name, $terrainRoles)) return false;

        // chef-chantier et conducteur-travaux seulement sur leurs projets
        if (in_array($user->role->name, ['chef-chantier', 'conducteur-travaux'])) {
            return $project->members()->where('user_id', $user->id)->exists();
        }

        return true;
    }

    public function viewAny(User $user, Project $project): bool
    {
        if ($user->company_id !== $project->company_id) {
            return false;
        }

        // lecture-seule excluded from operational terrain data
        if ($user->role->name === 'lecture-seule') {
            return false;
        }

        return true;
    }

    public function update(User $user, DailyLog $dailyLog, Project $project): bool
    {
        if ($user->company_id !== $project->company_id) return false;

        $allowedRoles = ['direction', 'directeur-technique', 'conducteur-travaux'];
        if (in_array($user->role->name, $allowedRoles)) return true;

        if ($user->role->name === 'chef-chantier') {
            return $project->members()->where('user_id', $user->id)->exists();
        }

        return false;
    }

    public function delete(User $user, DailyLog $dailyLog, Project $project): bool
    {
        return $this->update($user, $dailyLog, $project);
    }
}
