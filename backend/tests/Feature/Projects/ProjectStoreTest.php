<?php

use App\Models\Company;
use App\Models\Role;
use App\Models\User;

it('creates a project for the authenticated user company', function () {
    $company = Company::factory()->create();
    $role = Role::query()->first();
    $user = User::factory()->create([
        'company_id' => $company->id,
        'role_id' => $role->id,
    ]);

    $response = $this->actingAs($user)->postJson('/api/projects', [
        'code' => 'CH-ANGRE-2026-001',
        'name' => 'Construction villa duplex R+1 - Cocody Angre',
        'status' => 'active',
        'location' => 'Abidjan',
        'budget_amount' => 85000000,
    ]);

    $response
        ->assertCreated()
        ->assertJsonPath('data.company_id', $company->id)
        ->assertJsonPath('data.code', 'CH-ANGRE-2026-001');

    $this->assertDatabaseHas('projects', [
        'company_id' => $company->id,
        'code' => 'CH-ANGRE-2026-001',
    ]);
});
