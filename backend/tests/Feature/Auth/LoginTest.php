<?php

use App\Models\Company;
use App\Models\Role;
use App\Models\User;

it('logs in a valid user and returns profile data', function () {
    $company = Company::factory()->create();
    $role = Role::query()->firstOrCreate(
        ['name' => 'direction'],
        ['label' => 'Direction']
    );

    $user = User::factory()->create([
        'company_id' => $company->id,
        'role_id' => $role->id,
        'email' => 'direction@example.com',
        'password' => 'password',
    ]);

    $response = $this->postJson('/api/auth/login', [
        'email' => 'direction@example.com',
        'password' => 'password',
    ]);

    $response
        ->assertOk()
        ->assertJsonPath('user.email', $user->email)
        ->assertJsonPath('user.role.name', 'direction')
        ->assertJsonPath('user.company.id', $company->id);
});
