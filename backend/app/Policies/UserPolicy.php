<?php

namespace App\Policies;

use App\Models\User;

class UserPolicy
{
    public function viewAny(User $auth): bool
    {
        return $auth->role->name === 'direction';
    }

    public function create(User $auth): bool
    {
        return $auth->role->name === 'direction';
    }

    public function update(User $auth, User $target): bool
    {
        return $auth->role->name === 'direction'
            && $auth->company_id === $target->company_id
            && $auth->id !== $target->id;
    }

    public function delete(User $auth, User $target): bool
    {
        return $auth->role->name === 'direction'
            && $auth->company_id === $target->company_id
            && $auth->id !== $target->id;
    }
}
