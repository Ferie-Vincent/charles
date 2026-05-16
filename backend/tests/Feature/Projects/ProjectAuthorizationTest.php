<?php

use App\Models\Company;
use App\Models\Project;
use App\Models\Role;
use App\Models\User;

it('forbids viewing a project from another company', function () {
    $companyA = Company::factory()->create();
    $companyB = Company::factory()->create();
    $role = Role::query()->first();

    $user = User::factory()->create([
        'company_id' => $companyA->id,
        'role_id'    => $role->id,
    ]);

    $project = Project::query()->create([
        'company_id'   => $companyB->id,
        'code'         => 'CH-XCOMP',
        'name'         => 'Cross Company Project',
        'status'       => 'active',
        'location'     => 'Bouaké',
        'budget_amount'=> 1000,
    ]);

    $this->actingAs($user)
        ->getJson("/api/projects/{$project->id}")
        ->assertForbidden();
});

it('forbids updating a project from another company', function () {
    $companyA = Company::factory()->create();
    $companyB = Company::factory()->create();
    $role = Role::query()->first();

    $user = User::factory()->create([
        'company_id' => $companyA->id,
        'role_id' => $role->id,
    ]);

    $project = Project::query()->create([
        'company_id' => $companyB->id,
        'code' => 'CH-OTHER',
        'name' => 'Other Company Project',
        'status' => 'active',
        'location' => 'Yamoussoukro',
        'budget_amount' => 1000,
    ]);

    $response = $this->actingAs($user)->putJson("/api/projects/{$project->id}", [
        'code' => 'CH-OTHER',
        'name' => 'Blocked Update',
        'status' => 'active',
    ]);

    $response->assertForbidden();
});
