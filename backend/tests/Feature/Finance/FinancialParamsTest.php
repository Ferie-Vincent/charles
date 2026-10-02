<?php

use App\Models\BudgetEntry;
use App\Models\Company;
use App\Models\DqeLine;
use App\Models\DqeVersion;
use App\Models\Project;
use App\Models\Role;
use App\Models\SituationTravaux;
use App\Models\Supplier;
use App\Models\User;

beforeEach(function () {
    $this->company = Company::factory()->create(['tva_rate' => 18, 'retenue_garantie_pct' => 5, 'delai_paiement_jours' => 60]);
    $this->user    = User::factory()->create([
        'company_id' => $this->company->id,
        'role_id'    => Role::where('name', 'direction')->value('id'),
    ]);
    $this->project = Project::factory()->create([
        'company_id'   => $this->company->id,
        'status'       => 'active',
        'type_marche'  => 'forfait',
        'montant_marche' => 10_000_000,
        'budget_amount'  => 10_000_000,
    ]);
    seedPermissions();
});

function paramsValidatedDqe(Project $project, User $user): DqeVersion
{
    $dqe = DqeVersion::create([
        'project_id' => $project->id, 'created_by' => $user->id,
        'version_number' => 1, 'name' => 'DQE', 'status' => 'validated', 'total_ht' => 10_000_000,
    ]);
    DqeLine::create(['dqe_version_id' => $dqe->id, 'lot' => 'GO', 'ouvrage' => 'Béton', 'unite' => 'm³', 'quantite' => 100, 'prix_unitaire' => 100_000, 'ordre' => 1]);
    return $dqe;
}

// ── Résolution projet → entreprise → config ─────────────────────────────────

it('resolves financial rates from project, then company, then config', function () {
    expect($this->project->effective_tva_rate)->toBe(18.0)
        ->and($this->project->effective_retenue_garantie_pct)->toBe(5.0)
        ->and($this->project->effective_delai_paiement_jours)->toBe(60);

    $this->company->update(['tva_rate' => 0, 'retenue_garantie_pct' => 10, 'delai_paiement_jours' => 90]);
    $p = $this->project->fresh();
    expect($p->effective_tva_rate)->toBe(0.0)
        ->and($p->effective_retenue_garantie_pct)->toBe(10.0)
        ->and($p->effective_delai_paiement_jours)->toBe(90);

    $p->update(['tva_rate' => 18, 'retenue_garantie_pct' => 7.5, 'delai_paiement_jours' => 30]);
    $p = $p->fresh();
    expect($p->effective_tva_rate)->toBe(18.0)
        ->and($p->effective_retenue_garantie_pct)->toBe(7.5)
        ->and($p->effective_delai_paiement_jours)->toBe(30);
});

it('exposes effective rates on the project detail endpoint', function () {
    $this->project->update(['retenue_garantie_pct' => 10]);

    $this->actingAs($this->user)->getJson("/api/projects/{$this->project->id}")
        ->assertOk()
        ->assertJsonPath('data.effective_retenue_garantie_pct', 10)
        ->assertJsonPath('data.effective_tva_rate', 18)
        ->assertJsonPath('data.effective_delai_paiement_jours', 60);
});

it('lets direction update company defaults and project overrides', function () {
    $this->actingAs($this->user)
        ->putJson('/api/profile/company', ['name' => 'Charles SA', 'tva_rate' => 0, 'delai_paiement_jours' => 90])
        ->assertOk()
        ->assertJsonPath('company.delai_paiement_jours', 90);

    $this->actingAs($this->user)
        ->putJson("/api/projects/{$this->project->id}", ['retenue_garantie_pct' => 10])
        ->assertOk();

    expect($this->project->fresh()->effective_retenue_garantie_pct)->toBe(10.0)
        ->and($this->project->fresh()->effective_tva_rate)->toBe(0.0);
});

// ── Situations utilisent les taux effectifs ─────────────────────────────────

it('computes a situation with the project retenue and tva rates (exonerated market, 10 % rg)', function () {
    paramsValidatedDqe($this->project, $this->user);
    $this->project->update(['tva_rate' => 0, 'retenue_garantie_pct' => 10]);

    $res = $this->actingAs($this->user)
        ->postJson("/api/projects/{$this->project->id}/situations", ['periode' => '2026-10', 'avancement_pct' => 20])
        ->assertCreated();

    $s = $res->json('situation');
    expect((float) $s['montant_brut_ht'])->toBe(2_000_000.0)
        ->and((float) $s['retenue_garantie_pct'])->toBe(10.0)
        ->and((float) $s['retenue_garantie_amount'])->toBe(200_000.0)
        ->and((float) $s['vat_rate'])->toBe(0.0)
        ->and((float) $s['vat_amount'])->toBe(0.0)
        ->and((float) $s['net_a_payer'])->toBe(1_800_000.0);
});

// ── Trésorerie entrante ─────────────────────────────────────────────────────

it('turns a validated situation into an expected receivable dated by the payment delay', function () {
    $this->project->update(['delai_paiement_jours' => 45]);

    $sit = SituationTravaux::create([
        'project_id' => $this->project->id, 'company_id' => $this->company->id, 'created_by' => $this->user->id,
        'numero' => 'ST-001', 'periode' => '2026-09', 'avancement_pct' => 30,
        'montant_brut_ht' => 3_000_000, 'retenue_garantie_pct' => 5, 'retenue_garantie_amount' => 150_000,
        'vat_rate' => 18, 'vat_amount' => 513_000, 'net_a_payer' => 3_363_000,
        'status' => 'validee_moe', 'submitted_at' => now()->subDays(20), 'validated_at' => now()->subDays(10),
    ]);

    $res = $this->actingAs($this->user)->getJson("/api/projects/{$this->project->id}/budget")->assertOk();

    $creances = $res->json('creances');
    expect($creances)->toHaveCount(1)
        ->and($creances[0]['numero'])->toBe('ST-001')
        ->and((float) $creances[0]['amount'])->toBe(3_363_000.0)
        ->and($creances[0]['expected_date'])->toBe(now()->subDays(10)->addDays(45)->toDateString())
        ->and($creances[0]['overdue'])->toBeFalse()
        ->and($creances[0]['basis'])->toBe('validation_moe')
        ->and((float) $res->json('totals.creances_en_attente'))->toBe(3_363_000.0)
        ->and($res->json('totals.delai_paiement_jours'))->toBe(45);

    // Le graphe 90 j porte désormais une barre « encaissement »
    $chart = $res->json('chart');
    expect((float) array_sum(array_column($chart, 'encaissement')))->toBe(3_363_000.0);

    // Payée → plus une créance
    $sit->update(['status' => 'payee', 'paid_at' => now()]);
    $this->actingAs($this->user)->getJson("/api/projects/{$this->project->id}/budget")
        ->assertOk()->assertJsonCount(0, 'creances');
});

it('flags an overdue receivable and books it in the first 90-day bucket', function () {
    SituationTravaux::create([
        'project_id' => $this->project->id, 'company_id' => $this->company->id, 'created_by' => $this->user->id,
        'numero' => 'ST-002', 'periode' => '2026-06', 'avancement_pct' => 10,
        'montant_brut_ht' => 1_000_000, 'retenue_garantie_pct' => 5, 'retenue_garantie_amount' => 50_000,
        'vat_rate' => 18, 'vat_amount' => 171_000, 'net_a_payer' => 1_121_000,
        'status' => 'validee_moe', 'validated_at' => now()->subDays(100),
    ]);

    $res = $this->actingAs($this->user)->getJson("/api/projects/{$this->project->id}/budget")->assertOk();
    expect($res->json('creances.0.overdue'))->toBeTrue()
        ->and((float) $res->json('chart.0.encaissement'))->toBe(1_121_000.0);
});

// ── RG par défaut facture sous-traitant ─────────────────────────────────────

it('applies the project retenue de garantie by default to a subcontractor invoice', function () {
    $sub = Supplier::create(['company_id' => $this->company->id, 'project_id' => $this->project->id, 'category' => 'sous-traitance', 'name' => 'Sous-traitant X', 'created_by' => $this->user->id]);
    $fou = Supplier::create(['company_id' => $this->company->id, 'project_id' => $this->project->id, 'category' => 'fournitures', 'name' => 'Fournisseur Y', 'created_by' => $this->user->id]);

    $base = ['category' => 'Sous-traitance', 'amount_ht' => 1_000_000, 'status' => 'brouillon', 'invoice_date' => now()->toDateString()];

    $r1 = $this->actingAs($this->user)->postJson("/api/projects/{$this->project->id}/invoices", $base + ['reference' => 'F-ST', 'supplier_id' => $sub->id])->assertCreated();
    expect((float) $r1->json('retenue_garantie_pct'))->toBe(5.0)
        ->and((float) $r1->json('retenue_garantie_amount'))->toBe(59_000.0); // 5 % du TTC 1 180 000

    $r2 = $this->actingAs($this->user)->postJson("/api/projects/{$this->project->id}/invoices", $base + ['reference' => 'F-FO', 'supplier_id' => $fou->id])->assertCreated();
    expect((float) $r2->json('retenue_garantie_pct'))->toBe(0.0);
});
