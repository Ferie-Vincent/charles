<?php

use App\Models\Company;
use App\Models\Role;
use App\Models\User;

it('assigns a user to one company and one role', function () {
    $company = Company::factory()->create();
    $role = Role::query()->create(['name' => 'direction', 'label' => 'Direction']);

    $user = User::factory()->create([
        'company_id' => $company->id,
        'role_id' => $role->id,
    ]);

    expect($user->company)->not->toBeNull()
        ->and($user->role)->not->toBeNull()
        ->and($user->company->is($company))->toBeTrue()
        ->and($user->role->is($role))->toBeTrue();
});
