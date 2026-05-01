<?php

use App\Models\Company;
use App\Models\DqeLine;
use App\Models\DqeVersion;
use App\Models\Project;
use App\Models\Role;
use App\Models\User;
use Illuminate\Support\Facades\Http;

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

it('requires auth', function () {
    $this->postJson("/api/projects/{$this->project->id}/situation-travaux", [])
        ->assertUnauthorized();
});

it('returns 422 if no validated dqe exists', function () {
    $this->actingAs($this->user)
        ->postJson("/api/projects/{$this->project->id}/situation-travaux", [
            'periode' => '2026-05',
        ])
        ->assertUnprocessable()
        ->assertJsonFragment(['error' => 'Aucun DQE validé trouvé pour ce chantier.']);
});

it('validates periode format', function () {
    $this->actingAs($this->user)
        ->postJson("/api/projects/{$this->project->id}/situation-travaux", [
            'periode' => 'invalid',
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['periode']);
});

it('returns 503 when no ai key configured', function () {
    $version = DqeVersion::create([
        'project_id'     => $this->project->id,
        'created_by'     => $this->user->id,
        'version_number' => 1,
        'name'           => 'DQE',
        'status'         => 'validated',
    ]);

    // Remove API keys for this test
    config(['services.groq.key' => null, 'services.anthropic.key' => null]);

    $this->actingAs($this->user)
        ->postJson("/api/projects/{$this->project->id}/situation-travaux", [
            'periode' => '2026-05',
        ])
        ->assertStatus(503)
        ->assertJsonFragment(['error' => 'Aucune clé IA configurée (GROQ_API_KEY ou ANTHROPIC_API_KEY).']);
});

it('generates situation using specific dqe_version_id', function () {
    $version = DqeVersion::create([
        'project_id'     => $this->project->id,
        'created_by'     => $this->user->id,
        'version_number' => 1,
        'name'           => 'DQE Spécifique',
        'status'         => 'draft',
    ]);

    // Mock Groq HTTP call
    Http::fake([
        'https://api.groq.com/*' => Http::response([
            'choices' => [['message' => ['content' => '# Situation générée par mock']]],
        ], 200),
    ]);

    config(['services.groq.key' => 'test-key', 'services.anthropic.key' => null]);

    $response = $this->actingAs($this->user)
        ->postJson("/api/projects/{$this->project->id}/situation-travaux", [
            'periode'        => '2026-05',
            'dqe_version_id' => $version->id,
            'avancement'     => 35,
        ])
        ->assertOk();

    $response->assertJsonFragment([
        'dqe_version'    => 'DQE Spécifique',
        'dqe_version_id' => $version->id,
        'avancement'     => 35.0,
    ]);
    expect($response->json('situation'))->toContain('Situation');
});

it('cannot generate situation for another company project', function () {
    $otherCompany = Company::factory()->create();
    $otherRole    = Role::query()->first();
    $otherUser    = User::factory()->create(['company_id' => $otherCompany->id, 'role_id' => $otherRole->id]);
    $otherProject = Project::factory()->create(['company_id' => $otherCompany->id]);

    $this->actingAs($this->user)
        ->postJson("/api/projects/{$otherProject->id}/situation-travaux", [
            'periode' => '2026-05',
        ])
        ->assertForbidden();
});

it('lists dqe versions for situation modal', function () {
    DqeVersion::create([
        'project_id'     => $this->project->id,
        'created_by'     => $this->user->id,
        'version_number' => 1,
        'name'           => 'DQE v1',
        'status'         => 'validated',
    ]);

    $this->actingAs($this->user)
        ->getJson("/api/projects/{$this->project->id}/situation-travaux/versions")
        ->assertOk()
        ->assertJsonCount(1)
        ->assertJsonFragment(['name' => 'DQE v1']);
});
