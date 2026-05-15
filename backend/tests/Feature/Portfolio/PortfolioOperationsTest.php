<?php

use App\Models\Company;
use App\Models\DailyLog;
use App\Models\Project;
use App\Models\PurchaseOrder;
use App\Models\Role;
use App\Models\StockItem;
use App\Models\User;

beforeEach(function () {
    $this->company = Company::factory()->create();
    $role          = Role::query()->first();
    $this->user    = User::factory()->create([
        'company_id' => $this->company->id,
        'role_id'    => $role->id,
    ]);
});

it('requires authentication', function () {
    $this->getJson('/api/portfolio/operations')->assertUnauthorized();
});

it('returns correct response shape', function () {
    $this->actingAs($this->user)
        ->getJson('/api/portfolio/operations')
        ->assertOk()
        ->assertJsonStructure([
            'health_summary'    => ['avg_score', 'critical_count', 'total_active'],
            'budget_summary'    => ['previsionnel', 'engage', 'realise', 'tauxEngage', 'tauxRealise'],
            'bdc_pending',
            'stock_alerts',
            'critical_projects',
        ]);
});

it('only counts active projects in health summary', function () {
    Project::factory()->create(['company_id' => $this->company->id, 'status' => 'active']);
    Project::factory()->create(['company_id' => $this->company->id, 'status' => 'en_preparation']);
    Project::factory()->create(['company_id' => $this->company->id, 'status' => 'completed']);

    $response = $this->actingAs($this->user)
        ->getJson('/api/portfolio/operations')
        ->assertOk();

    expect($response->json('health_summary.total_active'))->toBe(1);
});

it('lists bdc with status soumis and correct age_days', function () {
    $order = PurchaseOrder::factory()->create([
        'company_id' => $this->company->id,
        'status'     => 'soumis',
        'created_at' => now()->subDays(3),
    ]);

    $response = $this->actingAs($this->user)
        ->getJson('/api/portfolio/operations')
        ->assertOk();

    $bdc = collect($response->json('bdc_pending'));
    expect($bdc)->toHaveCount(1);
    expect($bdc->first()['id'])->toBe($order->id);
    expect($bdc->first()['age_days'])->toBe(3);
});

it('excludes bdc from other company', function () {
    $other = Company::factory()->create();
    PurchaseOrder::factory()->create(['company_id' => $other->id, 'status' => 'soumis']);

    $response = $this->actingAs($this->user)
        ->getJson('/api/portfolio/operations')
        ->assertOk();

    expect($response->json('bdc_pending'))->toBeEmpty();
});

it('excludes approved or received bdc from pending list', function () {
    PurchaseOrder::factory()->create(['company_id' => $this->company->id, 'status' => 'approuve']);
    PurchaseOrder::factory()->create(['company_id' => $this->company->id, 'status' => 'recu']);

    $response = $this->actingAs($this->user)
        ->getJson('/api/portfolio/operations')
        ->assertOk();

    expect($response->json('bdc_pending'))->toBeEmpty();
});

it('lists stock items below threshold as alerts', function () {
    StockItem::factory()->create([
        'company_id' => $this->company->id,
        'quantity'   => 5,
        'threshold'  => 20,
    ]);

    $response = $this->actingAs($this->user)
        ->getJson('/api/portfolio/operations')
        ->assertOk();

    $alerts = collect($response->json('stock_alerts'));
    expect($alerts)->toHaveCount(1);
    expect((float) $alerts->first()['deficit'])->toBe(15.0);
});

it('excludes stock items above threshold', function () {
    StockItem::factory()->create([
        'company_id' => $this->company->id,
        'quantity'   => 50,
        'threshold'  => 20,
    ]);

    $response = $this->actingAs($this->user)
        ->getJson('/api/portfolio/operations')
        ->assertOk();

    expect($response->json('stock_alerts'))->toBeEmpty();
});

it('excludes stock alerts from other company', function () {
    $other = Company::factory()->create();
    StockItem::factory()->create(['company_id' => $other->id, 'quantity' => 0, 'threshold' => 10]);

    $response = $this->actingAs($this->user)
        ->getJson('/api/portfolio/operations')
        ->assertOk();

    expect($response->json('stock_alerts'))->toBeEmpty();
});

it('reports critical projects with health score below 50', function () {
    $project = Project::factory()->create([
        'company_id'      => $this->company->id,
        'status'          => 'active',
        'target_progress' => 100,
    ]);
    foreach (range(1, 5) as $i) {
        DailyLog::factory()->create([
            'project_id'   => $project->id,
            'user_id'      => $this->user->id,
            'has_incident' => true,
            'log_date'     => now()->subDays($i)->toDateString(),
        ]);
    }

    $response = $this->actingAs($this->user)
        ->getJson('/api/portfolio/operations')
        ->assertOk();

    $critical = collect($response->json('critical_projects'));
    expect($critical->pluck('id'))->toContain($project->id);
    expect($critical->first()['health_label'])->toBe('critical');
});
