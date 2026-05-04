<?php

use App\Models\Company;
use App\Models\DemandeBesoin;
use App\Models\Project;
use App\Models\PurchaseOrder;
use App\Models\Role;
use App\Models\StockItem;
use App\Models\User;

// ── Helpers ─────────────────────────────────────────────────────────────────

function rbacUser(string $roleName, Company $company): User
{
    $role = Role::where('name', $roleName)->firstOrFail();
    return User::factory()->create(['company_id' => $company->id, 'role_id' => $role->id]);
}

function rbacProject(Company $company, array $attrs = []): Project
{
    return Project::factory()->create(array_merge(['company_id' => $company->id], $attrs));
}

// ── Project CRUD ─────────────────────────────────────────────────────────────

describe('Project create', function () {
    beforeEach(function () {
        $this->company = Company::factory()->create();
    });

    it('allows direction and DT to create projects', function (string $role) {
        $user = rbacUser($role, $this->company);
        $this->actingAs($user)
            ->postJson('/api/projects', [
                'code' => 'CH-TEST', 'name' => 'Test', 'status' => 'draft',
                'location' => 'Abidjan', 'budget_amount' => 5000,
                'start_date' => '2026-01-01', 'end_date' => '2026-12-31',
            ])
            ->assertCreated();
    })->with(['direction', 'directeur-technique']);

    it('forbids non-management roles from creating projects', function (string $role) {
        $user = rbacUser($role, $this->company);
        $this->actingAs($user)
            ->postJson('/api/projects', [
                'code' => 'CH-TEST', 'name' => 'Test', 'status' => 'draft',
                'location' => 'Abidjan', 'budget_amount' => 5000,
            ])
            ->assertForbidden();
    })->with(['conducteur-travaux', 'chef-chantier', 'metreur-economiste', 'comptable', 'moyens-generaux', 'lecture-seule']);
});

describe('Project delete', function () {
    beforeEach(function () {
        $this->company = Company::factory()->create();
        $this->project = rbacProject($this->company);
    });

    it('allows direction and DT to delete projects', function (string $role) {
        $user = rbacUser($role, $this->company);
        $this->actingAs($user)
            ->deleteJson("/api/projects/{$this->project->id}")
            ->assertNoContent();

        $this->project = rbacProject($this->company); // recreate for next iteration
    })->with(['direction', 'directeur-technique']);

    it('forbids non-management roles from deleting projects', function (string $role) {
        $user = rbacUser($role, $this->company);
        $this->actingAs($user)
            ->deleteJson("/api/projects/{$this->project->id}")
            ->assertForbidden();
    })->with(['conducteur-travaux', 'chef-chantier', 'metreur-economiste', 'comptable', 'moyens-generaux', 'lecture-seule']);
});

describe('Project field-level update', function () {
    beforeEach(function () {
        $this->company = Company::factory()->create();
        $this->project = rbacProject($this->company);
    });

    it('direction can update any project field', function () {
        $user = rbacUser('direction', $this->company);
        $this->actingAs($user)
            ->putJson("/api/projects/{$this->project->id}", [
                'code' => 'CH-UPD', 'name' => 'Updated', 'status' => 'active',
                'budget_amount' => 9999, 'target_progress' => 40,
            ])
            ->assertOk();
    });

    it('conducteur-travaux can update status, progress, location, end_date only', function () {
        $user = rbacUser('conducteur-travaux', $this->company);
        $this->project->members()->create(['user_id' => $user->id, 'role' => 'conducteur-travaux']);

        $this->actingAs($user)
            ->putJson("/api/projects/{$this->project->id}", ['status' => 'active', 'target_progress' => 30])
            ->assertOk()
            ->assertJsonPath('data.target_progress', 30);

        // budget_amount must be stripped (project budget unchanged)
        $originalBudget = $this->project->budget_amount;
        $this->actingAs($user)
            ->putJson("/api/projects/{$this->project->id}", ['budget_amount' => 999999])
            ->assertForbidden(); // only budget_amount = empty $data → 403
    });

    it('metreur-economiste can update budget_amount and target_progress', function () {
        $user = rbacUser('metreur-economiste', $this->company);
        $response = $this->actingAs($user)
            ->putJson("/api/projects/{$this->project->id}", ['budget_amount' => 75000, 'target_progress' => 55])
            ->assertOk();
        expect((float) $response->json('data.budget_amount'))->toBe(75000.0);
    });

    it('comptable cannot update any project field', function () {
        $user = rbacUser('comptable', $this->company);
        $this->actingAs($user)
            ->putJson("/api/projects/{$this->project->id}", ['status' => 'active'])
            ->assertForbidden();
    });

    it('chef-chantier member can update status and progress', function () {
        $user = rbacUser('chef-chantier', $this->company);
        $this->project->members()->create(['user_id' => $user->id, 'role' => 'chef-chantier']);

        $this->actingAs($user)
            ->putJson("/api/projects/{$this->project->id}", ['status' => 'active', 'target_progress' => 20])
            ->assertOk();
    });

    it('chef-chantier non-member is forbidden from viewing the project', function () {
        $user = rbacUser('chef-chantier', $this->company);
        $this->actingAs($user)
            ->getJson("/api/projects/{$this->project->id}")
            ->assertForbidden();
    });
});

// ── Portfolio operations (direction/DT only) ──────────────────────────────────

describe('Portfolio operations endpoint', function () {
    beforeEach(function () {
        $this->company = Company::factory()->create();
    });

    it('allows direction and DT to access portfolio operations', function (string $role) {
        $user = rbacUser($role, $this->company);
        $this->actingAs($user)
            ->getJson('/api/portfolio/operations')
            ->assertOk();
    })->with(['direction', 'directeur-technique']);

    it('forbids non-management roles from portfolio operations', function (string $role) {
        $user = rbacUser($role, $this->company);
        $this->actingAs($user)
            ->getJson('/api/portfolio/operations')
            ->assertForbidden();
    })->with(['conducteur-travaux', 'chef-chantier', 'metreur-economiste', 'comptable', 'moyens-generaux', 'lecture-seule']);
});

// ── Purchase order creation / approval ───────────────────────────────────────

describe('Purchase order RBAC', function () {
    beforeEach(function () {
        $this->company = Company::factory()->create();
        $this->project = rbacProject($this->company);
    });

    it('allows BDC_CREATORS to create purchase orders', function (string $role) {
        $user = rbacUser($role, $this->company);
        if (in_array($role, ['conducteur-travaux', 'chef-chantier'])) {
            $this->project->members()->create(['user_id' => $user->id, 'role' => $role]);
        }
        $this->actingAs($user)
            ->postJson('/api/purchase-orders', [
                'project_id' => $this->project->id,
                'items'      => [['description' => 'Ciment', 'quantity' => 10, 'unit' => 'sac', 'unit_price' => 5000]],
            ])
            ->assertCreated();
    })->with(['direction', 'directeur-technique', 'conducteur-travaux', 'metreur-economiste', 'moyens-generaux']);

    it('forbids chef-chantier, comptable, lecture-seule from creating BDC', function (string $role) {
        $user = rbacUser($role, $this->company);
        if ($role === 'chef-chantier') {
            $this->project->members()->create(['user_id' => $user->id, 'role' => $role]);
        }
        $this->actingAs($user)
            ->postJson('/api/purchase-orders', [
                'project_id' => $this->project->id,
                'items'      => [['description' => 'Test', 'quantity' => 1, 'unit' => 'u', 'unit_price' => 100]],
            ])
            ->assertForbidden();
    })->with(['chef-chantier', 'comptable', 'lecture-seule']);

    it('allows only direction and DT to approve purchase orders', function (string $role) {
        $direction = rbacUser('direction', $this->company);
        $po = PurchaseOrder::factory()->create([
            'company_id' => $this->company->id,
            'project_id' => $this->project->id,
            'status'     => 'soumis',
        ]);

        $user = rbacUser($role, $this->company);
        $this->actingAs($user)
            ->patchJson("/api/purchase-orders/{$po->id}/approve")
            ->assertForbidden();
    })->with(['conducteur-travaux', 'chef-chantier', 'metreur-economiste', 'comptable', 'moyens-generaux']);
});

// ── Stock adjustments audit log ───────────────────────────────────────────────

describe('Stock adjustments audit endpoint', function () {
    beforeEach(function () {
        $this->company = Company::factory()->create();
    });

    it('allows management and logistics to view adjustment audit', function (string $role) {
        $user = rbacUser($role, $this->company);
        $this->actingAs($user)
            ->getJson('/api/stock-movements/adjustments')
            ->assertOk();
    })->with(['direction', 'directeur-technique', 'moyens-generaux']);

    it('forbids terrain, metreur, comptable, lecture from adjustment audit', function (string $role) {
        $user = rbacUser($role, $this->company);
        $this->actingAs($user)
            ->getJson('/api/stock-movements/adjustments')
            ->assertForbidden();
    })->with(['conducteur-travaux', 'chef-chantier', 'metreur-economiste', 'comptable', 'lecture-seule']);
});

// ── Demande besoin workflow ───────────────────────────────────────────────────

describe('Demande besoin RBAC', function () {
    beforeEach(function () {
        $this->company = Company::factory()->create();
        $this->project = rbacProject($this->company);
    });

    it('allows terrain and management to create demandes', function (string $role) {
        $user = rbacUser($role, $this->company);
        if (in_array($role, ['conducteur-travaux', 'chef-chantier'])) {
            $this->project->members()->create(['user_id' => $user->id, 'role' => $role]);
        }
        $this->actingAs($user)
            ->postJson('/api/demandes-besoins', [
                'project_id'  => $this->project->id,
                'title'       => 'Ciment x 50 sacs',
                'category'    => 'materiaux',
                'urgency'     => 'normal',
            ])
            ->assertCreated();
    })->with(['direction', 'directeur-technique', 'conducteur-travaux', 'chef-chantier']);

    it('forbids comptable, logistique, lecture from creating demandes', function (string $role) {
        $user = rbacUser($role, $this->company);
        $this->actingAs($user)
            ->postJson('/api/demandes-besoins', [
                'project_id' => $this->project->id,
                'title'      => 'Test',
                'category'   => 'materiaux',
                'urgency'    => 'normal',
            ])
            ->assertForbidden();
    })->with(['comptable', 'moyens-generaux', 'lecture-seule']);

    it('allows only management to approve demandes', function () {
        $creator = rbacUser('chef-chantier', $this->company);
        $this->project->members()->create(['user_id' => $creator->id, 'role' => 'chef-chantier']);

        $demande = DemandeBesoin::create([
            'company_id'   => $this->company->id,
            'project_id'   => $this->project->id,
            'requested_by' => $creator->id,
            'title'        => 'Ciment test',
            'category'     => 'materiaux',
            'urgency'      => 'normal',
            'status'       => 'soumis',
        ]);

        foreach (['conducteur-travaux', 'chef-chantier', 'metreur-economiste', 'comptable', 'moyens-generaux'] as $role) {
            $u = rbacUser($role, $this->company);
            if (in_array($role, ['conducteur-travaux', 'chef-chantier'])) {
                $this->project->members()->create(['user_id' => $u->id, 'role' => $role]);
            }
            $this->actingAs($u)
                ->patchJson("/api/demandes-besoins/{$demande->id}/approve")
                ->assertForbidden();
        }

        $direction = rbacUser('direction', $this->company);
        $this->actingAs($direction)
            ->patchJson("/api/demandes-besoins/{$demande->id}/approve")
            ->assertOk();
    });
});

// ── Multi-tenant isolation ────────────────────────────────────────────────────

describe('Cross-company isolation', function () {
    it('prevents access to another company project', function () {
        $companyA = Company::factory()->create();
        $companyB = Company::factory()->create();
        $user     = rbacUser('direction', $companyA);
        $project  = rbacProject($companyB);

        $this->actingAs($user)
            ->getJson("/api/projects/{$project->id}")
            ->assertForbidden();
    });

    it('prevents updating another company project', function () {
        $companyA = Company::factory()->create();
        $companyB = Company::factory()->create();
        $user     = rbacUser('direction', $companyA);
        $project  = rbacProject($companyB);

        $this->actingAs($user)
            ->putJson("/api/projects/{$project->id}", ['status' => 'active'])
            ->assertForbidden();
    });

    it('prevents deleting another company project', function () {
        $companyA = Company::factory()->create();
        $companyB = Company::factory()->create();
        $user     = rbacUser('direction', $companyA);
        $project  = rbacProject($companyB);

        $this->actingAs($user)
            ->deleteJson("/api/projects/{$project->id}")
            ->assertForbidden();
    });
});
