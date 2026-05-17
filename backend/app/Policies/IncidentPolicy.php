<?php

namespace App\Policies;

use App\Models\Incident;
use App\Models\Project;
use App\Models\User;

class IncidentPolicy
{
    public function view(User $user, Incident $incident): bool
    {
        return $user->company_id === $incident->project->company_id
            && (new ProjectPolicy())->view($user, $incident->project);
    }

    /**
     * Appelé via authorize('create', [Incident::class, $project]).
     * Reçoit un Project (le parent) au lieu d'un Incident (pas encore créé).
     */
    public function create(User $user, Project $project): bool
    {
        return (new ProjectPolicy())->update($user, $project);
    }

    public function update(User $user, Incident $incident): bool
    {
        return (new ProjectPolicy())->update($user, $incident->project);
    }

    public function delete(User $user, Incident $incident): bool
    {
        if (!in_array($user->role->name, ['direction', 'directeur-technique'])) {
            return false;
        }

        return $user->company_id === $incident->project->company_id;
    }
}
