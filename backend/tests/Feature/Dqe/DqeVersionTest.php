<?php

use App\Models\Company;
use App\Models\DqeVersion;
use App\Models\Project;
use App\Models\Role;
use App\Models\User;

// ── Helpers ───────────────────────────────────────────────────

function dqeUser(Company $company, string $roleSlug): User
{
    $role = Role::where('name', $roleSlug)->firstOrFail();
    return User::factory()->create(['company_id' => $company->id, 'role_id' => $role->id]);
}

function dqeVersion(Project $project, User $user, string $status = 'draft'): DqeVersion
{
    return DqeVersion::create([
        'project_id'     => $project->id,
        'created_by'     => $user->id,
        'version_number' => ($project->dqeVersions()->max('version_number') ?? 0) + 1,
        'name'           => 'DQE Test',
        'status'         => $status,
    ]);
}

beforeEach(function () {
    $this->company = Company::factory()->create();
    $this->project = Project::factory()->create(['company_id' => $this->company->id]);
    $this->dg      = dqeUser($this->company, 'direction');
    $this->dt      = dqeUser($this->company, 'directeur-technique');
    $this->cond    = dqeUser($this->company, 'conducteur-travaux');
    $this->chef    = dqeUser($this->company, 'chef-chantier');
    $this->metr    = dqeUser($this->company, 'metreur-economiste');
    $this->comp    = dqeUser($this->company, 'comptable');
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
    $this->actingAs($this->dg)
        ->getJson("/api/projects/{$this->project->id}/dqe-versions")
        ->assertOk()
        ->assertJson([]);
});

it('returns versions for the project', function () {
    dqeVersion($this->project, $this->dg);

    $this->actingAs($this->dg)
        ->getJson("/api/projects/{$this->project->id}/dqe-versions")
        ->assertOk()
        ->assertJsonCount(1)
        ->assertJsonFragment(['name' => 'DQE Test']);
});

// ── Store ────────────────────────────────────────────────────

it('creates a dqe version', function () {
    $this->actingAs($this->metr)
        ->postJson("/api/projects/{$this->project->id}/dqe-versions", [
            'name'  => 'DQE Test',
            'notes' => 'Version initiale',
        ])
        ->assertCreated()
        ->assertJsonFragment(['name' => 'DQE Test', 'status' => 'draft', 'version_number' => 1]);
});

it('auto-increments version_number', function () {
    dqeVersion($this->project, $this->metr);

    $this->actingAs($this->metr)
        ->postJson("/api/projects/{$this->project->id}/dqe-versions", ['name' => 'v2'])
        ->assertCreated()
        ->assertJsonFragment(['version_number' => 2]);
});

it('validates name is required', function () {
    $this->actingAs($this->metr)
        ->postJson("/api/projects/{$this->project->id}/dqe-versions", [])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['name']);
});

it('forbids comptable from creating dqe version', function () {
    $this->actingAs($this->comp)
        ->postJson("/api/projects/{$this->project->id}/dqe-versions", ['name' => 'DQE'])
        ->assertForbidden();
});

it('forbids chef-chantier from creating dqe version', function () {
    $this->actingAs($this->chef)
        ->postJson("/api/projects/{$this->project->id}/dqe-versions", ['name' => 'DQE'])
        ->assertForbidden();
});

// ── Cross-company isolation ───────────────────────────────────

it('cannot access dqe versions of another company project', function () {
    $other = Company::factory()->create();
    $otherProject = Project::factory()->create(['company_id' => $other->id]);
    $otherUser = dqeUser($other, 'direction');
    dqeVersion($otherProject, $otherUser);

    $this->actingAs($this->dg)
        ->getJson("/api/projects/{$otherProject->id}/dqe-versions")
        ->assertForbidden();
});

// ── Update ───────────────────────────────────────────────────

it('updates a dqe version name', function () {
    $v = dqeVersion($this->project, $this->metr);

    $this->actingAs($this->metr)
        ->putJson("/api/projects/{$this->project->id}/dqe-versions/{$v->id}", ['name' => 'Nouveau nom'])
        ->assertOk()
        ->assertJsonFragment(['name' => 'Nouveau nom']);
});

// ── Delete ───────────────────────────────────────────────────

it('deletes a draft version', function () {
    $v = dqeVersion($this->project, $this->metr);

    $this->actingAs($this->dg)
        ->deleteJson("/api/projects/{$this->project->id}/dqe-versions/{$v->id}")
        ->assertNoContent();

    expect(DqeVersion::find($v->id))->toBeNull();
});

// ── Transitions : soumission (draft → soumise) ────────────────

it('metreur can submit draft dqe', function () {
    $v = dqeVersion($this->project, $this->metr);

    $this->actingAs($this->metr)
        ->patchJson("/api/projects/{$this->project->id}/dqe-versions/{$v->id}/transition", ['status' => 'soumise'])
        ->assertOk()
        ->assertJsonFragment(['status' => 'soumise']);
});

it('conducteur-travaux can submit draft dqe', function () {
    $v = dqeVersion($this->project, $this->cond);

    $this->actingAs($this->cond)
        ->patchJson("/api/projects/{$this->project->id}/dqe-versions/{$v->id}/transition", ['status' => 'soumise'])
        ->assertOk()
        ->assertJsonFragment(['status' => 'soumise']);
});

it('directeur-technique can submit draft dqe', function () {
    $v = dqeVersion($this->project, $this->dt);

    $this->actingAs($this->dt)
        ->patchJson("/api/projects/{$this->project->id}/dqe-versions/{$v->id}/transition", ['status' => 'soumise'])
        ->assertOk()
        ->assertJsonFragment(['status' => 'soumise']);
});

it('direction cannot submit (must go through soumise)', function () {
    $v = dqeVersion($this->project, $this->dg);

    $this->actingAs($this->dg)
        ->patchJson("/api/projects/{$this->project->id}/dqe-versions/{$v->id}/transition", ['status' => 'soumise'])
        ->assertForbidden();
});

it('chef-chantier cannot submit dqe', function () {
    $v = dqeVersion($this->project, $this->chef);

    $this->actingAs($this->chef)
        ->patchJson("/api/projects/{$this->project->id}/dqe-versions/{$v->id}/transition", ['status' => 'soumise'])
        ->assertForbidden();
});

it('comptable cannot submit dqe', function () {
    $v = dqeVersion($this->project, $this->comp);

    $this->actingAs($this->comp)
        ->patchJson("/api/projects/{$this->project->id}/dqe-versions/{$v->id}/transition", ['status' => 'soumise'])
        ->assertForbidden();
});

// ── Transitions : validation directe (draft → validated) ─────

it('direction can validate draft dqe directly', function () {
    $v = dqeVersion($this->project, $this->dg);

    $this->actingAs($this->dg)
        ->patchJson("/api/projects/{$this->project->id}/dqe-versions/{$v->id}/transition", ['status' => 'validated'])
        ->assertOk()
        ->assertJsonFragment(['status' => 'validated']);
});

it('directeur-technique can validate draft dqe directly', function () {
    $v = dqeVersion($this->project, $this->dt);

    $this->actingAs($this->dt)
        ->patchJson("/api/projects/{$this->project->id}/dqe-versions/{$v->id}/transition", ['status' => 'validated'])
        ->assertOk()
        ->assertJsonFragment(['status' => 'validated']);
});

it('metreur cannot validate draft dqe directly', function () {
    $v = dqeVersion($this->project, $this->metr);

    $this->actingAs($this->metr)
        ->patchJson("/api/projects/{$this->project->id}/dqe-versions/{$v->id}/transition", ['status' => 'validated'])
        ->assertForbidden();
});

// ── Transitions : validation post-soumission (soumise → validated) ──

it('direction validates submitted dqe', function () {
    $v = dqeVersion($this->project, $this->metr, 'soumise');

    $this->actingAs($this->dg)
        ->patchJson("/api/projects/{$this->project->id}/dqe-versions/{$v->id}/transition", ['status' => 'validated'])
        ->assertOk()
        ->assertJsonFragment(['status' => 'validated']);
});

it('directeur-technique can validate submitted dqe', function () {
    $v = dqeVersion($this->project, $this->metr, 'soumise');

    $this->actingAs($this->dt)
        ->patchJson("/api/projects/{$this->project->id}/dqe-versions/{$v->id}/transition", ['status' => 'validated'])
        ->assertOk()
        ->assertJsonFragment(['status' => 'validated']);
});

it('metreur cannot validate submitted dqe', function () {
    $v = dqeVersion($this->project, $this->metr, 'soumise');

    $this->actingAs($this->metr)
        ->patchJson("/api/projects/{$this->project->id}/dqe-versions/{$v->id}/transition", ['status' => 'validated'])
        ->assertForbidden();
});

// ── Transitions : rejet (soumise → draft) ────────────────────

it('direction rejects submitted dqe with reason', function () {
    $v = dqeVersion($this->project, $this->metr, 'soumise');

    $this->actingAs($this->dg)
        ->patchJson("/api/projects/{$this->project->id}/dqe-versions/{$v->id}/transition", [
            'status' => 'draft',
            'reason' => 'Prix unitaires incorrects pour le lot Gros Œuvre.',
        ])
        ->assertOk()
        ->assertJsonFragment(['status' => 'draft', 'rejection_reason' => 'Prix unitaires incorrects pour le lot Gros Œuvre.']);
});

it('rejection requires a reason', function () {
    $v = dqeVersion($this->project, $this->metr, 'soumise');

    $this->actingAs($this->dg)
        ->patchJson("/api/projects/{$this->project->id}/dqe-versions/{$v->id}/transition", [
            'status' => 'draft',
        ])
        ->assertStatus(422);
});

it('rejection reason is cleared on resubmission', function () {
    $v = dqeVersion($this->project, $this->metr, 'soumise');

    // Reject
    $this->actingAs($this->dg)
        ->patchJson("/api/projects/{$this->project->id}/dqe-versions/{$v->id}/transition", [
            'status' => 'draft',
            'reason' => 'À corriger.',
        ])
        ->assertOk();

    // Resubmit
    $this->actingAs($this->metr)
        ->patchJson("/api/projects/{$this->project->id}/dqe-versions/{$v->id}/transition", [
            'status' => 'soumise',
        ])
        ->assertOk()
        ->assertJsonFragment(['rejection_reason' => null]);
});

it('directeur-technique can reject submitted dqe', function () {
    $v = dqeVersion($this->project, $this->metr, 'soumise');

    $this->actingAs($this->dt)
        ->patchJson("/api/projects/{$this->project->id}/dqe-versions/{$v->id}/transition", [
            'status' => 'draft',
            'reason' => 'Motif.',
        ])
        ->assertOk()
        ->assertJsonFragment(['status' => 'draft']);
});

// ── Transitions : archivage ───────────────────────────────────

it('direction can archive a validated dqe when another validated version exists', function () {
    $v = dqeVersion($this->project, $this->dg, 'validated');
    dqeVersion($this->project, $this->dg, 'validated'); // replacement version

    $this->actingAs($this->dg)
        ->patchJson("/api/projects/{$this->project->id}/dqe-versions/{$v->id}/transition", ['status' => 'archived'])
        ->assertOk()
        ->assertJsonFragment(['status' => 'archived']);
});

it('cannot archive the only validated dqe', function () {
    $v = dqeVersion($this->project, $this->dg, 'validated');

    $this->actingAs($this->dg)
        ->patchJson("/api/projects/{$this->project->id}/dqe-versions/{$v->id}/transition", ['status' => 'archived'])
        ->assertUnprocessable();
});

it('directeur-technique can archive a validated dqe when another validated version exists', function () {
    $v = dqeVersion($this->project, $this->dg, 'validated');
    dqeVersion($this->project, $this->dg, 'validated'); // replacement version

    $this->actingAs($this->dt)
        ->patchJson("/api/projects/{$this->project->id}/dqe-versions/{$v->id}/transition", ['status' => 'archived'])
        ->assertOk()
        ->assertJsonFragment(['status' => 'archived']);
});

it('metreur cannot archive a dqe', function () {
    $v = dqeVersion($this->project, $this->metr, 'validated');

    $this->actingAs($this->metr)
        ->patchJson("/api/projects/{$this->project->id}/dqe-versions/{$v->id}/transition", ['status' => 'archived'])
        ->assertForbidden();
});

// ── Transitions : invalides ───────────────────────────────────

it('cannot transition archived dqe', function () {
    $v = dqeVersion($this->project, $this->dg, 'archived');

    $this->actingAs($this->dg)
        ->patchJson("/api/projects/{$this->project->id}/dqe-versions/{$v->id}/transition", ['status' => 'draft'])
        ->assertStatus(422);
});

it('cannot edit locked dqe', function () {
    $v = dqeVersion($this->project, $this->metr, 'soumise');

    $this->actingAs($this->metr)
        ->putJson("/api/projects/{$this->project->id}/dqe-versions/{$v->id}", ['name' => 'Modif'])
        ->assertStatus(422);
});
