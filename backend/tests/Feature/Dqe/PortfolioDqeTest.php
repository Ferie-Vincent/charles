<?php

use App\Models\Company;
use App\Models\DqeVersion;
use App\Models\Project;
use App\Models\Role;
use App\Models\User;

beforeEach(function () {
    $this->company = Company::factory()->create();
    $role = Role::query()->first();
    $this->user = User::factory()->create([
        'company_id' => $this->company->id,
        'role_id'    => $role->id,
    ]);
    $this->project = Project::factory()->create([
        'company_id' => $this->company->id,
    ]);
});

it('requires auth for portfolio dqe', function () {
    $this->getJson('/api/portfolio/dqe')->assertUnauthorized();
});

it('returns dqe versions for own company only', function () {
    // Own company version
    DqeVersion::create([
        'project_id'     => $this->project->id,
        'created_by'     => $this->user->id,
        'version_number' => 1,
        'name'           => 'Own DQE',
        'status'         => 'validated',
    ]);

    // Other company version — must NOT appear
    $otherCompany  = Company::factory()->create();
    $otherRole     = Role::query()->first();
    $otherUser     = User::factory()->create(['company_id' => $otherCompany->id, 'role_id' => $otherRole->id]);
    $otherProject  = Project::factory()->create(['company_id' => $otherCompany->id]);
    DqeVersion::create([
        'project_id'     => $otherProject->id,
        'created_by'     => $otherUser->id,
        'version_number' => 1,
        'name'           => 'Other DQE',
        'status'         => 'validated',
    ]);

    $response = $this->actingAs($this->user)
        ->getJson('/api/portfolio/dqe')
        ->assertOk();

    $response->assertJsonCount(1);
    $response->assertJsonFragment(['name' => 'Own DQE']);
    $response->assertJsonMissing(['name' => 'Other DQE']);
});

it('returns lines_count and project info in portfolio response', function () {
    $version = DqeVersion::create([
        'project_id'     => $this->project->id,
        'created_by'     => $this->user->id,
        'version_number' => 1,
        'name'           => 'DQE Portfolio',
        'status'         => 'draft',
    ]);

    $response = $this->actingAs($this->user)
        ->getJson('/api/portfolio/dqe')
        ->assertOk();

    $response->assertJsonFragment([
        'project_name' => $this->project->name,
        'lines_count'  => 0,
    ]);
});

it('returns empty array when no dqe versions', function () {
    $this->actingAs($this->user)
        ->getJson('/api/portfolio/dqe')
        ->assertOk()
        ->assertJson([]);
});
