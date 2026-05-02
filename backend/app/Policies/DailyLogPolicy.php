<?php

namespace App\Policies;

use App\Models\Project;
use App\Models\User;

class DailyLogPolicy
{
    public function create(User $user, Project $project): bool
    {
        return $user->company_id === $project->company_id
            && $user->role->name !== 'lecture-seule';
    }

    public function viewAny(User $user, Project $project): bool
    {
        return $user->company_id === $project->company_id;
    }
}
