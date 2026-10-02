<?php

use App\Models\Company;
use App\Models\DailyLog;
use App\Models\Project;
use App\Models\PurchaseOrder;
use App\Models\Role;
use App\Models\StockItem;
use App\Models\StockMovement;
use App\Models\User;
use App\Services\ProjectFinancialMetricsService;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    Storage::fake('public');
    $this->company = Company::factory()->create();
    $this->direction = User::factory()->create(['company_id' => $this->company->id, 'role_id' => Role::where('name', 'direction')->value('id')]);
    $this->logist    = User::factory()->create(['company_id' => $this->company->id, 'role_id' => Role::where('name', 'moyens-generaux')->value('id')]);
    $this->chef      = User::factory()->create(['company_id' => $this->company->id, 'role_id' => Role::where('name', 'chef-chantier')->value('id')]);
    $this->project   = Project::factory()->create(['company_id' => $this->company->id, 'status' => 'active', 'budget_amount' => 5_000_000]);
    $this->ciment    = StockItem::create([
        'company_id' => $this->company->id, 'created_by' => $this->logist->id,
        'name' => 'Ciment CPA', 'category' => 'materiaux', 'unit' => 'sac', 'quantity' => 100, 'threshold' => 10, 'unit_cost' => 5000,
    ]);
    seedPermissions();
});

it('computes a weighted average unit cost on entry', function () {
    // 100 sacs à 5 000 + 100 sacs à 7 000 → PMP 6 000
    expect($this->ciment->weightedUnitCostAfterEntry(100, 7000))->toBe(6000.0)
        ->and($this->ciment->weightedUnitCostAfterEntry(50, null))->toBe(5000.0);   // entrée non valorisée : PMP inchangé

    $empty = StockItem::create(['company_id' => $this->company->id, 'created_by' => $this->logist->id, 'name' => 'Fer HA12', 'category' => 'materiaux', 'unit' => 't', 'quantity' => 0, 'unit_cost' => 0]);
    expect($empty->weightedUnitCostAfterEntry(3, 530_000))->toBe(530_000.0);
});

it('values a bdc reception and updates the item pmp', function () {
    $requester = User::factory()->create(['company_id' => $this->company->id, 'role_id' => Role::where('name', 'conducteur-travaux')->value('id')]);
    $bdc = PurchaseOrder::create([
        'company_id' => $this->company->id, 'project_id' => $this->project->id, 'requested_by' => $requester->id,
        'approved_by' => $this->direction->id, 'approved_at' => now(),
        'reference' => 'BDC-VAL', 'status' => 'approuve', 'total_amount' => 700_000,
        'items' => [['description' => 'Ciment', 'stock_item_id' => $this->ciment->id, 'quantity' => 100, 'unit_price' => 7000]],
    ]);

    $this->actingAs($this->logist)
        ->patch("/api/purchase-orders/{$bdc->id}/receive", ['delivery_note' => UploadedFile::fake()->create('bl.pdf', 10, 'application/pdf')])
        ->assertOk();

    $this->ciment->refresh();
    expect($this->ciment->quantity)->toBe(200.0)->and($this->ciment->unit_cost)->toBe(6000.0);

    $mv = StockMovement::where('purchase_order_id', $bdc->id)->first();
    expect($mv->unit_cost)->toBe(7000.0)->and($mv->total_cost)->toBe(700_000.0);
});

it('values a project stock exit at the current pmp and exposes it in the financial metrics', function () {
    $this->actingAs($this->logist)
        ->postJson("/api/stock-items/{$this->ciment->id}/movements", [
            'type' => 'sortie', 'quantity' => 40, 'reason' => 'Dalle R+1', 'movement_date' => now()->toDateString(), 'project_id' => $this->project->id,
        ])->assertCreated()
        ->assertJsonPath('movement.unit_cost', 5000)
        ->assertJsonPath('movement.total_cost', 200_000);

    $this->project->load(['budgetEntries', 'invoices', 'dqeVersions']);
    $m = (new ProjectFinancialMetricsService())->compute($this->project);
    expect($m['materiaux_stock_consommes'])->toBe(200_000.0)
        ->and($m['engage'])->toBe(0.0); // informatif : pas ajouté à l'engagé
});

it('requires a project on a field exit', function () {
    $cdt = User::factory()->create(['company_id' => $this->company->id, 'role_id' => Role::where('name', 'conducteur-travaux')->value('id')]);
    // La direction a ouvert « stocks » au terrain (matrice de permissions configurable)
    \App\Models\RolePermission::updateOrCreate(
        ['company_id' => $this->company->id, 'role_id' => $cdt->role_id, 'feature' => 'stocks'],
        ['enabled' => true]
    );
    $this->actingAs($cdt)
        ->postJson("/api/stock-items/{$this->ciment->id}/movements", [
            'type' => 'sortie', 'quantity' => 5, 'reason' => 'x', 'movement_date' => now()->toDateString(),
        ])->assertStatus(422);
});

it('reconciles journal receipts against stock exits per material', function () {
    DailyLog::factory()->create([
        'project_id' => $this->project->id, 'user_id' => $this->chef->id, 'log_date' => now()->subDays(2)->toDateString(),
        'materials_received' => [['name' => 'ciment cpa', 'quantity' => 30, 'unit' => 'sac'], ['name' => 'Sable', 'quantity' => 10, 'unit' => 'm³']],
    ]);
    StockMovement::create(['stock_item_id' => $this->ciment->id, 'created_by' => $this->logist->id, 'project_id' => $this->project->id, 'type' => 'sortie', 'quantity' => 40, 'unit_cost' => 5000, 'total_cost' => 200_000, 'reason' => 'x', 'movement_date' => now()->toDateString()]);

    $res = $this->actingAs($this->direction)->getJson("/api/projects/{$this->project->id}/material-receipts")->assertOk();
    $rap = collect($res->json('rapprochement'))->keyBy(fn ($r) => mb_strtolower($r['name']));

    expect((float) $rap['ciment cpa']['journal_qty'])->toBe(30.0)
        ->and((float) $rap['ciment cpa']['stock_qty'])->toBe(40.0)
        ->and((float) $rap['ciment cpa']['ecart_qty'])->toBe(-10.0)
        ->and($rap['ciment cpa']['status'])->toBe('ecart')
        ->and((float) $rap['ciment cpa']['stock_value'])->toBe(200_000.0)
        ->and($rap['sable']['status'])->toBe('journal_only');
});
