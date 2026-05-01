<?php

use App\Models\Company;
use App\Models\DqeLine;
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
    $this->version = DqeVersion::create([
        'project_id'     => $this->project->id,
        'created_by'     => $this->user->id,
        'version_number' => 1,
        'name'           => 'DQE Test',
        'status'         => 'draft',
    ]);
});

// ── Auth ─────────────────────────────────────────────────────

it('requires auth to add a line', function () {
    $this->postJson("/api/projects/{$this->project->id}/dqe-versions/{$this->version->id}/lines", [])
        ->assertUnauthorized();
});

// ── Store line ───────────────────────────────────────────────

it('creates a dqe line and auto-computes montant_ht', function () {
    $payload = [
        'lot'           => 'Lot 01 – Gros Œuvre',
        'ouvrage'       => 'Béton armé fondations',
        'unite'         => 'm³',
        'quantite'      => 50,
        'prix_unitaire' => 235000,
        'ordre'         => 1,
    ];

    $this->actingAs($this->user)
        ->postJson("/api/projects/{$this->project->id}/dqe-versions/{$this->version->id}/lines", $payload)
        ->assertCreated()
        ->assertJsonFragment(['montant_ht' => 11750000]);
});

it('updates dqe version total_ht after adding a line', function () {
    $this->actingAs($this->user)
        ->postJson("/api/projects/{$this->project->id}/dqe-versions/{$this->version->id}/lines", [
            'lot'           => 'Lot 01',
            'ouvrage'       => 'Test',
            'unite'         => 'm²',
            'quantite'      => 10,
            'prix_unitaire' => 100000,
            'ordre'         => 1,
        ]);

    $this->version->refresh();
    expect((float) $this->version->total_ht)->toBe(1000000.0);
});

it('validates required fields for a line', function () {
    $this->actingAs($this->user)
        ->postJson("/api/projects/{$this->project->id}/dqe-versions/{$this->version->id}/lines", [])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['lot', 'ouvrage', 'unite', 'quantite', 'prix_unitaire']);
});

// ── Update line (PUT) ─────────────────────────────────────────

it('updates a line and recomputes total', function () {
    // Create via API so recomputeTotal is triggered
    $createResponse = $this->actingAs($this->user)
        ->postJson("/api/projects/{$this->project->id}/dqe-versions/{$this->version->id}/lines", [
            'lot'           => 'Lot 01',
            'ouvrage'       => 'Béton',
            'unite'         => 'm³',
            'quantite'      => 10,
            'prix_unitaire' => 100000,
            'ordre'         => 1,
        ])
        ->assertCreated();

    $lineId = $createResponse->json('id');

    $this->actingAs($this->user)
        ->putJson("/api/projects/{$this->project->id}/dqe-versions/{$this->version->id}/lines/{$lineId}", [
            'quantite' => 20,
        ])
        ->assertOk();

    $this->version->refresh();
    expect((float) $this->version->total_ht)->toBe(2000000.0);
});

// ── Delete line ──────────────────────────────────────────────

it('deletes a line and updates total_ht', function () {
    $createResponse = $this->actingAs($this->user)
        ->postJson("/api/projects/{$this->project->id}/dqe-versions/{$this->version->id}/lines", [
            'lot'           => 'Lot 01',
            'ouvrage'       => 'Test',
            'unite'         => 'u',
            'quantite'      => 5,
            'prix_unitaire' => 50000,
            'ordre'         => 1,
        ])
        ->assertCreated();

    $lineId = $createResponse->json('id');
    $this->version->refresh();
    expect((float) $this->version->total_ht)->toBe(250000.0);

    $this->actingAs($this->user)
        ->deleteJson("/api/projects/{$this->project->id}/dqe-versions/{$this->version->id}/lines/{$lineId}")
        ->assertNoContent();

    $this->version->refresh();
    expect((float) $this->version->total_ht)->toBe(0.0);
});

// ── montant_ht auto-compute ──────────────────────────────────

it('auto-computes montant_ht on model save', function () {
    $line = DqeLine::create([
        'dqe_version_id' => $this->version->id,
        'lot'            => 'Lot 01',
        'ouvrage'        => 'Test',
        'unite'          => 'm²',
        'quantite'       => 7,
        'prix_unitaire'  => 15000,
        'ordre'          => 1,
    ]);

    expect((float) $line->montant_ht)->toBe(105000.0);
});
