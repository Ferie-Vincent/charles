<?php

use App\Models\Company;
use App\Models\Invoice;
use App\Models\Project;
use App\Models\PurchaseOrder;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

function makeUser(Company $company, string $roleName): User
{
    $role = Role::where('name', $roleName)->first();
    return User::factory()->create([
        'company_id' => $company->id,
        'role_id'    => $role->id,
    ]);
}

function makeProject(Company $company): Project
{
    return Project::create([
        'company_id'    => $company->id,
        'code'          => 'CH-TEST-' . uniqid(),
        'name'          => 'Test Project',
        'status'        => 'active',
        'location'      => 'Abidjan',
        'budget_amount' => 1000000,
    ]);
}

function makeInvoice(Project $project, User $creator, string $status = 'soumise', bool $withAttachment = false, ?int $purchaseOrderId = null): Invoice
{
    return Invoice::create([
        'project_id'       => $project->id,
        'created_by'       => $creator->id,
        'reference'        => 'FACT-' . uniqid(),
        'category'         => 'Matériaux',
        'amount_ht'        => 100000,
        'invoice_date'     => now()->toDateString(),
        'status'           => $status,
        'attachment_path'  => $withAttachment ? 'invoices/test/facture.pdf' : null,
        'attachment_name'  => $withAttachment ? 'facture.pdf' : null,
        'purchase_order_id' => $purchaseOrderId,
    ]);
}

function makePurchaseOrder(Company $company, User $requester): PurchaseOrder
{
    return PurchaseOrder::create([
        'company_id'   => $company->id,
        'requested_by' => $requester->id,
        'reference'    => 'BDC-TEST-' . uniqid(),
        'status'       => 'approuve',
        'items'        => json_encode([['description' => 'Test', 'quantity' => 1, 'unit_price' => 100000]]),
        'total_amount' => 100000,
    ]);
}

// ── transition() → validee ────────────────────────────────────────────────────

it('direction can validate a soumise invoice', function () {
    $company   = Company::factory()->create();
    $direction = makeUser($company, 'direction');
    $comptable = makeUser($company, 'comptable');
    $project   = makeProject($company);
    $invoice   = makeInvoice($project, $comptable);

    $res = $this->actingAs($direction)
        ->patchJson("/api/projects/{$project->id}/invoices/{$invoice->id}/transition", ['status' => 'validee']);

    $res->assertOk()
        ->assertJsonPath('status', 'validee')
        ->assertJsonPath('validated_by', $direction->id);
});

it('directeur-technique can validate a soumise invoice', function () {
    $company = Company::factory()->create();
    $dt      = makeUser($company, 'directeur-technique');
    $creator = makeUser($company, 'comptable');
    $project = makeProject($company);
    $invoice = makeInvoice($project, $creator);

    $res = $this->actingAs($dt)
        ->patchJson("/api/projects/{$project->id}/invoices/{$invoice->id}/transition", ['status' => 'validee']);

    $res->assertOk()->assertJsonPath('status', 'validee');
});

it('comptable cannot validate an invoice', function () {
    $company   = Company::factory()->create();
    $comptable = makeUser($company, 'comptable');
    $project   = makeProject($company);
    $invoice   = makeInvoice($project, $comptable);

    $res = $this->actingAs($comptable)
        ->patchJson("/api/projects/{$project->id}/invoices/{$invoice->id}/transition", ['status' => 'validee']);

    $res->assertForbidden();
});

it('cannot validate an already validated invoice', function () {
    $company   = Company::factory()->create();
    $direction = makeUser($company, 'direction');
    $creator   = makeUser($company, 'comptable');
    $project   = makeProject($company);
    $invoice   = makeInvoice($project, $creator, 'validee');

    $res = $this->actingAs($direction)
        ->patchJson("/api/projects/{$project->id}/invoices/{$invoice->id}/transition", ['status' => 'validee']);

    $res->assertUnprocessable();
});

// ── pay() ─────────────────────────────────────────────────────────────────────

it('comptable can record payment with proof on a validee invoice', function () {
    Storage::fake('public');

    $company      = Company::factory()->create();
    $comptable    = makeUser($company, 'comptable');
    $project      = makeProject($company);
    $purchaseOrder = makePurchaseOrder($company, $comptable);
    $invoice      = makeInvoice($project, $comptable, 'validee', withAttachment: true, purchaseOrderId: $purchaseOrder->id);

    $proof = UploadedFile::fake()->create('proof.pdf', 50, 'application/pdf');

    $res = $this->actingAs($comptable)->postJson(
        "/api/projects/{$project->id}/invoices/{$invoice->id}/pay",
        [
            'paid_date'     => now()->toDateString(),
            'payment_proof' => $proof,
        ]
    );

    $res->assertOk()
        ->assertJsonPath('status', 'payee')
        ->assertJsonPath('paid_by', $comptable->id);

    // payment_proof_path is hidden from JSON responses (security: do not expose storage paths)
    $this->assertNull($res->json('payment_proof_path'));
    $this->assertNotNull($res->json('payment_proof_name'));
});

it('payment requires a proof file', function () {
    $company   = Company::factory()->create();
    $comptable = makeUser($company, 'comptable');
    $project   = makeProject($company);
    $invoice   = makeInvoice($project, $comptable, 'validee');

    $res = $this->actingAs($comptable)->postJson(
        "/api/projects/{$project->id}/invoices/{$invoice->id}/pay",
        ['paid_date' => now()->toDateString()]
    );

    $res->assertUnprocessable();
});

it('direction cannot record payment', function () {
    Storage::fake('public');

    $company   = Company::factory()->create();
    $direction = makeUser($company, 'direction');
    $creator   = makeUser($company, 'comptable');
    $project   = makeProject($company);
    $invoice   = makeInvoice($project, $creator, 'validee');

    $proof = UploadedFile::fake()->create('proof.pdf', 50, 'application/pdf');

    $res = $this->actingAs($direction)->postJson(
        "/api/projects/{$project->id}/invoices/{$invoice->id}/pay",
        [
            'paid_date'     => now()->toDateString(),
            'payment_proof' => $proof,
        ]
    );

    $res->assertForbidden();
});

it('cannot pay an invoice that is not yet validated', function () {
    Storage::fake('public');

    $company   = Company::factory()->create();
    $comptable = makeUser($company, 'comptable');
    $project   = makeProject($company);
    $invoice   = makeInvoice($project, $comptable, 'soumise');

    $proof = UploadedFile::fake()->create('proof.pdf', 50, 'application/pdf');

    $res = $this->actingAs($comptable)->postJson(
        "/api/projects/{$project->id}/invoices/{$invoice->id}/pay",
        [
            'paid_date'     => now()->toDateString(),
            'payment_proof' => $proof,
        ]
    );

    $res->assertUnprocessable();
});

// ── BDC partial invoicing / dispute cycle ─────────────────────────────────────

function makeBdcWithEngagement(Company $company, Project $project, User $approver, float $totalAmount): PurchaseOrder
{
    $bdc = PurchaseOrder::create([
        'company_id'   => $company->id,
        'project_id'   => $project->id,
        'requested_by' => $approver->id,
        'reference'    => 'BDC-' . uniqid(),
        'status'       => 'approuve',
        'items'        => json_encode([['description' => 'Matériaux', 'quantity' => 1, 'unit_price' => $totalAmount]]),
        'total_amount' => $totalAmount,
    ]);

    $entry = \App\Models\BudgetEntry::create([
        'project_id' => $project->id,
        'created_by' => $approver->id,
        'type'       => 'engagement',
        'category'   => 'Matériaux',
        'label'      => "BDC #{$bdc->reference}",
        'amount'     => $totalAmount,
        'entry_date' => now()->toDateString(),
    ]);

    $bdc->updateQuietly(['engagement_entry_id' => $entry->id]);

    return $bdc->fresh();
}

it('partial invoice validation reduces BDC engagement, not zeroes it', function () {
    $company   = Company::factory()->create();
    $direction = makeUser($company, 'direction');
    $comptable = makeUser($company, 'comptable');
    $project   = makeProject($company);

    $bdc = makeBdcWithEngagement($company, $project, $direction, 10_000_000);

    $invoice = Invoice::create([
        'project_id'        => $project->id,
        'created_by'        => $comptable->id,
        'reference'         => 'FACT-' . uniqid(),
        'category'          => 'Matériaux',
        'amount_ht'         => 3_000_000,
        'invoice_date'      => now()->toDateString(),
        'status'            => 'soumise',
        'purchase_order_id' => $bdc->id,
    ]);

    $this->actingAs($direction)
        ->patchJson("/api/projects/{$project->id}/invoices/{$invoice->id}/transition", ['status' => 'validee'])
        ->assertOk();

    $bdc->refresh();
    $entry = \App\Models\BudgetEntry::find($bdc->engagement_entry_id);

    expect($entry)->not->toBeNull()
        ->and((float) $entry->amount)->toBe(7_000_000.0);
});

it('disputee after validee restores BDC engagement to full partial amount', function () {
    $company   = Company::factory()->create();
    $direction = makeUser($company, 'direction');
    $comptable = makeUser($company, 'comptable');
    $project   = makeProject($company);

    $bdc = makeBdcWithEngagement($company, $project, $direction, 10_000_000);

    $invoice = Invoice::create([
        'project_id'        => $project->id,
        'created_by'        => $comptable->id,
        'reference'         => 'FACT-' . uniqid(),
        'category'          => 'Matériaux',
        'amount_ht'         => 3_000_000,
        'invoice_date'      => now()->toDateString(),
        'status'            => 'soumise',
        'purchase_order_id' => $bdc->id,
    ]);

    $this->actingAs($direction)
        ->patchJson("/api/projects/{$project->id}/invoices/{$invoice->id}/transition", ['status' => 'validee'])
        ->assertOk();

    $this->actingAs($direction)
        ->patchJson("/api/projects/{$project->id}/invoices/{$invoice->id}/transition", ['status' => 'disputee'])
        ->assertOk();

    $bdc->refresh();
    $entry = \App\Models\BudgetEntry::find($bdc->engagement_entry_id);

    expect($entry)->not->toBeNull()
        ->and((float) $entry->amount)->toBe(10_000_000.0);
});

it('revalidation after dispute cycle reduces engagement correctly', function () {
    $company   = Company::factory()->create();
    $direction = makeUser($company, 'direction');
    $comptable = makeUser($company, 'comptable');
    $project   = makeProject($company);

    $bdc = makeBdcWithEngagement($company, $project, $direction, 10_000_000);

    $invoice = Invoice::create([
        'project_id'        => $project->id,
        'created_by'        => $comptable->id,
        'reference'         => 'FACT-' . uniqid(),
        'category'          => 'Matériaux',
        'amount_ht'         => 3_000_000,
        'invoice_date'      => now()->toDateString(),
        'status'            => 'soumise',
        'purchase_order_id' => $bdc->id,
    ]);

    $this->actingAs($direction)
        ->patchJson("/api/projects/{$project->id}/invoices/{$invoice->id}/transition", ['status' => 'validee'])
        ->assertOk();

    $this->actingAs($direction)
        ->patchJson("/api/projects/{$project->id}/invoices/{$invoice->id}/transition", ['status' => 'disputee'])
        ->assertOk();

    $this->actingAs($direction)
        ->patchJson("/api/projects/{$project->id}/invoices/{$invoice->id}/transition", ['status' => 'soumise'])
        ->assertOk();

    $this->actingAs($direction)
        ->patchJson("/api/projects/{$project->id}/invoices/{$invoice->id}/transition", ['status' => 'validee'])
        ->assertOk();

    $bdc->refresh();
    $entry = \App\Models\BudgetEntry::find($bdc->engagement_entry_id);

    expect($entry)->not->toBeNull()
        ->and((float) $entry->amount)->toBe(7_000_000.0);
});
