<?php

namespace App\Policies;

use App\Models\Project;
use App\Models\User;

class ProjectPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->company_id !== null;
    }

    public function view(User $user, Project $project): bool
    {
        if ($user->company_id !== $project->company_id) {
            return false;
        }

        if (in_array($user->role->name, ['chef-chantier', 'conducteur-travaux'])) {
            return $project->members()->where('user_id', $user->id)->exists();
        }

        return true;
    }

    public function create(User $user): bool
    {
        return $user->company_id !== null;
    }

    public function update(User $user, Project $project): bool
    {
        return $user->company_id === $project->company_id;
    }
}
