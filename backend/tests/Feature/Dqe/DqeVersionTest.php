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

// ── Auth ─────────────────────────────────────────────────────

it('requires auth to list dqe versions', function () {
    $this->getJson("/api/projects/{$this->project->id}/dqe-versions")
        ->assertUnauthorized();
});

it('requires auth to create dqe version', function () {
    $this->postJson("/api/projects/{$this->project->id}/dqe-versions", [])
        ->assertUnauthorized();
});

// ── Index ────────────────────────────────────────────────────

it('returns empty list when no dqe versions', function () {
    $this->actingAs($this->user)
        ->getJson("/api/projects/{$this->project->id}/dqe-versions")
        ->assertOk()
        ->assertJson([]);
});

it('returns versions for the project', function () {
    DqeVersion::create([
        'project_id'     => $this->project->id,
        'created_by'     => $this->user->id,
        'version_number' => 1,
        'name'           => 'DQE Initial',
        'status'         => 'draft',
    ]);

    $this->actingAs($this->user)
        ->getJson("/api/projects/{$this->project->id}/dqe-versions")
        ->assertOk()
        ->assertJsonCount(1)
        ->assertJsonFragment(['name' => 'DQE Initial']);
});

// ── Store ────────────────────────────────────────────────────

it('creates a dqe version', function () {
    $this->actingAs($this->user)
        ->postJson("/api/projects/{$this->project->id}/dqe-versions", [
            'name'  => 'DQE Test',
            'notes' => 'Version initiale',
        ])
        ->assertCreated()
        ->assertJsonFragment(['name' => 'DQE Test', 'status' => 'draft', 'version_number' => 1]);

    expect(DqeVersion::where('project_id', $this->project->id)->count())->toBe(1);
});

it('auto-increments version_number', function () {
    DqeVersion::create([
        'project_id'     => $this->project->id,
        'created_by'     => $this->user->id,
        'version_number' => 1,
        'name'           => 'v1',
        'status'         => 'draft',
    ]);

    $this->actingAs($this->user)
        ->postJson("/api/projects/{$this->project->id}/dqe-versions", ['name' => 'v2'])
        ->assertCreated()
        ->assertJsonFragment(['version_number' => 2]);
});

it('validates name is required', function () {
    $this->actingAs($this->user)
        ->postJson("/api/projects/{$this->project->id}/dqe-versions", [])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['name']);
});

// ── Cross-company isolation ───────────────────────────────────

it('cannot access dqe versions of another company project', function () {
    $otherCompany  = Company::factory()->create();
    $otherRole     = Role::query()->first();
    $otherUser     = User::factory()->create(['company_id' => $otherCompany->id, 'role_id' => $otherRole->id]);
    $otherProject  = Project::factory()->create(['company_id' => $otherCompany->id]);

    DqeVersion::create([
        'project_id'     => $otherProject->id,
        'created_by'     => $otherUser->id,
        'version_number' => 1,
        'name'           => 'Secret DQE',
        'status'         => 'draft',
    ]);

    $this->actingAs($this->user)
        ->getJson("/api/projects/{$otherProject->id}/dqe-versions")
        ->assertForbidden();
});

// ── Update (PUT) ─────────────────────────────────────────────

it('updates a dqe version name', function () {
    $version = DqeVersion::create([
        'project_id'     => $this->project->id,
        'created_by'     => $this->user->id,
        'version_number' => 1,
        'name'           => 'Old Name',
        'status'         => 'draft',
    ]);

    $this->actingAs($this->user)
        ->putJson("/api/projects/{$this->project->id}/dqe-versions/{$version->id}", [
            'name' => 'New Name',
        ])
        ->assertOk()
        ->assertJsonFragment(['name' => 'New Name']);
});

it('validates a draft version by updating status to validated', function () {
    $version = DqeVersion::create([
        'project_id'     => $this->project->id,
        'created_by'     => $this->user->id,
        'version_number' => 1,
        'name'           => 'DQE',
        'status'         => 'draft',
    ]);

    $this->actingAs($this->user)
        ->putJson("/api/projects/{$this->project->id}/dqe-versions/{$version->id}", [
            'status' => 'validated',
        ])
        ->assertOk()
        ->assertJsonFragment(['status' => 'validated']);
});

// ── Delete ───────────────────────────────────────────────────

it('deletes a draft version', function () {
    $version = DqeVersion::create([
        'project_id'     => $this->project->id,
        'created_by'     => $this->user->id,
        'version_number' => 1,
        'name'           => 'DQE',
        'status'         => 'draft',
    ]);

    $this->actingAs($this->user)
        ->deleteJson("/api/projects/{$this->project->id}/dqe-versions/{$version->id}")
        ->assertNoContent();

    expect(DqeVersion::find($version->id))->toBeNull();
});
