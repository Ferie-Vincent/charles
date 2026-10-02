<?php

use App\Models\Company;
use App\Models\Project;
use App\Models\Role;
use App\Models\SituationTravaux;
use App\Models\User;

beforeEach(function () {
    $this->company   = Company::factory()->create(['delai_paiement_jours' => 60]);
    $this->comptable = User::factory()->create(['company_id' => $this->company->id, 'role_id' => Role::where('name', 'comptable')->value('id')]);
    $this->chef      = User::factory()->create(['company_id' => $this->company->id, 'role_id' => Role::where('name', 'chef-chantier')->value('id')]);
    $this->project   = Project::factory()->create(['company_id' => $this->company->id, 'status' => 'active']);
    $this->situation = SituationTravaux::create([
        'project_id' => $this->project->id, 'company_id' => $this->company->id, 'created_by' => $this->comptable->id,
        'numero' => 'ST-001', 'periode' => '2026-09', 'avancement_pct' => 30,
        'montant_brut_ht' => 3_000_000, 'net_a_payer' => 3_363_000,
        'status' => 'validee_moe', 'validated_at' => now()->subDays(30),
    ]);
    seedPermissions();
});

it('lets accounting record service fait and ordre de paiement without changing the state', function () {
    $this->actingAs($this->comptable)
        ->patchJson("/api/projects/{$this->project->id}/situations/{$this->situation->id}/service-fait", [
            'service_fait_at'    => now()->subDays(5)->toDateString(),
            'ordre_paiement_ref' => 'OP-2026-0457',
            'ordre_paiement_at'  => now()->subDays(2)->toDateString(),
        ])
        ->assertOk()
        ->assertJsonPath('situation.status', 'validee_moe')
        ->assertJsonPath('situation.ordre_paiement_ref', 'OP-2026-0457');

    expect($this->situation->fresh()->service_fait_at->toDateString())->toBe(now()->subDays(5)->toDateString());
});

it('uses service fait as the receivable basis once recorded', function () {
    $this->situation->update(['service_fait_at' => now()->subDays(5)->toDateString()]);

    $res = $this->actingAs($this->comptable)->getJson("/api/projects/{$this->project->id}/budget")->assertOk();
    expect($res->json('creances.0.basis'))->toBe('service_fait')
        ->and($res->json('creances.0.expected_date'))->toBe(now()->subDays(5)->addDays(60)->toDateString());
});

it('rejects service fait from field roles and on non-validated situations', function () {
    $this->actingAs($this->chef)
        ->patchJson("/api/projects/{$this->project->id}/situations/{$this->situation->id}/service-fait", ['service_fait_at' => now()->toDateString()])
        ->assertForbidden();

    $this->situation->update(['status' => 'soumise']);
    $this->actingAs($this->comptable)
        ->patchJson("/api/projects/{$this->project->id}/situations/{$this->situation->id}/service-fait", ['service_fait_at' => now()->toDateString()])
        ->assertStatus(422);
});
