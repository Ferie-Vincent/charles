<?php

use App\Models\Company;
use App\Models\Role;
use App\Models\User;

it('lists only projects belonging to the authenticated user company', function () {
    $companyA = Company::factory()->create();
    $companyB = Company::factory()->create();
    $role = Role::query()->first();

    $user = User::factory()->create([
        'company_id' => $companyA->id,
        'role_id' => $role->id,
    ]);

    $projectA = \App\Models\Project::query()->create([
        'company_id' => $companyA->id,
        'code' => 'CH-001',
        'name' => 'Chantier A',
        'status' => 'active',
        'location' => 'Abidjan',
        'budget_amount' => 1000000,
    ]);

    \App\Models\Project::query()->create([
        'company_id' => $companyB->id,
        'code' => 'CH-002',
        'name' => 'Chantier B',
        'status' => 'active',
        'location' => 'Bouake',
        'budget_amount' => 2000000,
    ]);

    $response = $this->actingAs($user)->getJson('/api/projects');

    $response
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.id', $projectA->id);
});
