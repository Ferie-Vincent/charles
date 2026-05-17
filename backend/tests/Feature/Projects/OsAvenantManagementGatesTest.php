<?php

use App\Models\Avenant;
use App\Models\Company;
use App\Models\OrdreDeService;
use App\Models\Project;
use App\Models\Role;
use App\Models\User;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeUserWithRole(Company $company, string $roleName): User
{
    $role = Role::where('name', $roleName)->first()
        ?? Role::factory()->create(['name' => $roleName, 'label' => $roleName]);

    return User::factory()->create([
        'company_id' => $company->id,
        'role_id'    => $role->id,
    ]);
}

function makeProject(Company $company, float $montantMarche = 10_000_000): Project
{
    return Project::factory()->create([
        'company_id'     => $company->id,
        'montant_marche' => $montantMarche,
        'status'         => 'active',
    ]);
}

// ─── Gap #19: OS lifecycle gates ─────────────────────────────────────────────

it('allows direction to create OS demarrage', function () {
    $company = Company::factory()->create();
    $user    = makeUserWithRole($company, 'direction');
    $project = makeProject($company);

    $this->actingAs($user)
        ->postJson("/api/projects/{$project->id}/os", [
            'numero'  => 'OS-001',
            'type'    => 'demarrage',
            'objet'   => 'Démarrage officiel',
            'date_os' => '2026-05-17',
        ])
        ->assertCreated();
});

it('allows directeur-technique to create OS arret', function () {
    $company = Company::factory()->create();
    $user    = makeUserWithRole($company, 'directeur-technique');
    $project = makeProject($company);

    $this->actingAs($user)
        ->postJson("/api/projects/{$project->id}/os", [
            'numero'  => 'OS-002',
            'type'    => 'arret',
            'objet'   => 'Arrêt intempéries',
            'date_os' => '2026-05-17',
        ])
        ->assertCreated();
});

it('forbids conducteur-travaux from creating OS demarrage', function () {
    $company = Company::factory()->create();
    $user    = makeUserWithRole($company, 'conducteur-travaux');
    $project = makeProject($company);

    $this->actingAs($user)
        ->postJson("/api/projects/{$project->id}/os", [
            'numero'  => 'OS-003',
            'type'    => 'demarrage',
            'objet'   => 'Démarrage par CT',
            'date_os' => '2026-05-17',
        ])
        ->assertForbidden();
});

it('forbids conducteur-travaux from creating OS arret', function () {
    $company = Company::factory()->create();
    $user    = makeUserWithRole($company, 'conducteur-travaux');
    $project = makeProject($company);

    $this->actingAs($user)
        ->postJson("/api/projects/{$project->id}/os", [
            'numero'  => 'OS-004',
            'type'    => 'arret',
            'objet'   => 'Arrêt par CT',
            'date_os' => '2026-05-17',
        ])
        ->assertForbidden();
});

it('forbids conducteur-travaux from creating OS reprise', function () {
    $company = Company::factory()->create();
    $user    = makeUserWithRole($company, 'conducteur-travaux');
    $project = makeProject($company);

    $this->actingAs($user)
        ->postJson("/api/projects/{$project->id}/os", [
            'numero'  => 'OS-005',
            'type'    => 'reprise',
            'objet'   => 'Reprise par CT',
            'date_os' => '2026-05-17',
        ])
        ->assertForbidden();
});

it('allows conducteur-travaux to create OS travaux_supplementaires', function () {
    $company = Company::factory()->create();
    $user    = makeUserWithRole($company, 'conducteur-travaux');
    $project = makeProject($company);

    $this->actingAs($user)
        ->postJson("/api/projects/{$project->id}/os", [
            'numero'  => 'OS-006',
            'type'    => 'travaux_supplementaires',
            'objet'   => 'TS fondation',
            'date_os' => '2026-05-17',
        ])
        ->assertCreated();
});

it('allows conducteur-travaux to create OS autre', function () {
    $company = Company::factory()->create();
    $user    = makeUserWithRole($company, 'conducteur-travaux');
    $project = makeProject($company);

    $this->actingAs($user)
        ->postJson("/api/projects/{$project->id}/os", [
            'numero'  => 'OS-007',
            'type'    => 'autre',
            'objet'   => 'OS divers',
            'date_os' => '2026-05-17',
        ])
        ->assertCreated();
});

// ─── Gap #20: Avenant signing gates ──────────────────────────────────────────

it('allows direction to sign a small avenant', function () {
    $company = Company::factory()->create();
    $user    = makeUserWithRole($company, 'direction');
    $project = makeProject($company);
    $avenant = Avenant::factory()->create([
        'project_id' => $project->id,
        'company_id' => $company->id,
        'montant_ht' => 100_000, // 1% — below 5% threshold
        'status'     => 'soumis',
    ]);

    $this->actingAs($user)
        ->putJson("/api/projects/{$project->id}/avenants/{$avenant->id}", [
            'status' => 'signe',
        ])
        ->assertOk();
});

it('allows directeur-technique to sign a large avenant', function () {
    $company = Company::factory()->create();
    $user    = makeUserWithRole($company, 'directeur-technique');
    $project = makeProject($company);
    $avenant = Avenant::factory()->create([
        'project_id' => $project->id,
        'company_id' => $company->id,
        'montant_ht' => 800_000, // 8% — above 5% threshold
        'status'     => 'soumis',
    ]);

    $this->actingAs($user)
        ->putJson("/api/projects/{$project->id}/avenants/{$avenant->id}", [
            'status' => 'signe',
        ])
        ->assertOk();
});

it('forbids conducteur-travaux from signing any avenant', function () {
    $company = Company::factory()->create();
    $user    = makeUserWithRole($company, 'conducteur-travaux');
    $project = makeProject($company);
    $avenant = Avenant::factory()->create([
        'project_id' => $project->id,
        'company_id' => $company->id,
        'montant_ht' => 50_000, // 0.5% — well below 5%
        'status'     => 'soumis',
    ]);

    $this->actingAs($user)
        ->putJson("/api/projects/{$project->id}/avenants/{$avenant->id}", [
            'status' => 'signe',
        ])
        ->assertForbidden();
});

it('allows conducteur-travaux to submit (but not sign) an avenant', function () {
    $company = Company::factory()->create();
    $user    = makeUserWithRole($company, 'conducteur-travaux');
    $project = makeProject($company);
    $avenant = Avenant::factory()->create([
        'project_id' => $project->id,
        'company_id' => $company->id,
        'montant_ht' => 50_000,
        'status'     => 'brouillon',
    ]);

    $this->actingAs($user)
        ->putJson("/api/projects/{$project->id}/avenants/{$avenant->id}", [
            'status' => 'soumis',
        ])
        ->assertOk();
});

it('forbids metreur from signing any avenant', function () {
    $company = Company::factory()->create();
    $user    = makeUserWithRole($company, 'metreur-economiste');
    $project = makeProject($company);
    $avenant = Avenant::factory()->create([
        'project_id' => $project->id,
        'company_id' => $company->id,
        'montant_ht' => 200_000,
        'status'     => 'soumis',
    ]);

    $this->actingAs($user)
        ->putJson("/api/projects/{$project->id}/avenants/{$avenant->id}", [
            'status' => 'signe',
        ])
        ->assertForbidden();
});
