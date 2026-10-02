<?php

use App\Events\BdcApproved;
use App\Events\BdcCancelled;
use App\Events\InvoiceDisputee;
use App\Events\InvoicePaid;
use App\Events\InvoiceValidated;
use App\Exceptions\StateConflictException;
use App\Models\BudgetEntry;
use App\Models\Company;
use App\Models\Invoice;
use App\Models\Project;
use App\Models\ProjectSnapshot;
use App\Models\PurchaseOrder;
use App\Models\Role;
use App\Models\User;
use App\Support\Transition;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Route;

beforeEach(function () {
    $this->company = Company::factory()->create();
    $this->user    = User::factory()->create([
        'company_id' => $this->company->id,
        'role_id'    => Role::where('name', 'direction')->value('id'),
    ]);
    $this->project = Project::factory()->create([
        'company_id'    => $this->company->id,
        'status'        => 'active',
        'budget_amount' => 10_000_000,
        'start_date'    => now()->subDays(40),
        'end_date'      => now()->addDays(100),
    ]);
});

function finBdc(Project $project, User $user, float $amount = 1_000_000, string $status = 'approuve'): PurchaseOrder
{
    return PurchaseOrder::create([
        'company_id'   => $project->company_id,
        'project_id'   => $project->id,
        'requested_by' => $user->id,
        'approved_by'  => $user->id,
        'approved_at'  => now(),
        'reference'    => 'BDC-' . uniqid(),
        'status'       => $status,
        'items'        => [['description' => 'Ciment', 'quantity' => 1, 'unit_price' => $amount]],
        'total_amount' => $amount,
    ]);
}

function finInvoice(Project $project, User $user, PurchaseOrder $bdc, float $amountHt, string $status = 'validee'): Invoice
{
    return Invoice::create([
        'project_id'        => $project->id,
        'purchase_order_id' => $bdc->id,
        'created_by'        => $user->id,
        'reference'         => 'F-' . uniqid(),
        'category'          => 'Matériaux',
        'amount_ht'         => $amountHt,
        'invoice_date'      => now()->toDateString(),
        'status'            => $status,
        'paid_date'         => $status === 'payee' ? now()->toDateString() : null,
    ]);
}

// ── Idempotence des écritures automatiques ──────────────────────────────────

it('creates a single engagement entry even when BdcApproved is dispatched twice', function () {
    $bdc = finBdc($this->project, $this->user, 2_500_000);

    event(new BdcApproved($bdc, $this->user));
    event(new BdcApproved($bdc->fresh(), $this->user));

    $entries = BudgetEntry::where('project_id', $this->project->id)->where('type', 'engagement')->get();

    expect($entries)->toHaveCount(1)
        ->and((float) $entries->first()->amount)->toBe(2_500_000.0)
        ->and($entries->first()->source_type)->toBe('purchase_order')
        ->and($entries->first()->source_id)->toBe($bdc->id)
        ->and($bdc->fresh()->engagement_entry_id)->toBe($entries->first()->id);
});

it('converges engagement to bdc total minus validated invoices, whatever the event order', function () {
    $bdc = finBdc($this->project, $this->user, 1_000_000);
    event(new BdcApproved($bdc, $this->user));

    $inv = finInvoice($this->project, $this->user, $bdc, 400_000, 'validee');
    event(new InvoiceValidated($inv, $this->user));
    event(new InvoiceValidated($inv, $this->user)); // rejeu

    $amount = fn () => (float) BudgetEntry::where('source_type', 'purchase_order')->where('source_id', $bdc->id)->value('amount');
    expect($amount())->toBe(600_000.0);

    // Litige : la facture sort du facturé → engagement remonte
    $inv->update(['status' => 'disputee']);
    event(new InvoiceDisputee($inv, $this->user, 'validee'));
    event(new InvoiceDisputee($inv, $this->user, 'validee'));
    expect($amount())->toBe(1_000_000.0);

    // Facture couvrant tout le BDC → l'engagement disparaît
    $inv->update(['status' => 'validee', 'amount_ht' => 1_000_000]);
    event(new InvoiceValidated($inv, $this->user));
    expect(BudgetEntry::where('source_type', 'purchase_order')->where('source_id', $bdc->id)->exists())->toBeFalse()
        ->and($bdc->fresh()->engagement_entry_id)->toBeNull();
});

it('removes engagement when an approved bdc is cancelled', function () {
    $bdc = finBdc($this->project, $this->user, 800_000);
    event(new BdcApproved($bdc, $this->user));
    expect(BudgetEntry::where('type', 'engagement')->count())->toBe(1);

    $bdc->update(['status' => 'annule', 'rejection_reason' => 'Doublon']);
    event(new BdcCancelled($bdc, $this->user, true));

    expect(BudgetEntry::where('type', 'engagement')->count())->toBe(0);
});

it('records one payment entry per paid invoice even when InvoicePaid is replayed', function () {
    $bdc = finBdc($this->project, $this->user);
    $inv = finInvoice($this->project, $this->user, $bdc, 300_000, 'payee');

    event(new InvoicePaid($inv->load('project'), $this->user));
    event(new InvoicePaid($inv->load('project'), $this->user));

    expect(BudgetEntry::where('type', 'paiement')->where('source_type', 'invoice')->where('source_id', $inv->id)->count())->toBe(1);
});

it('rejects a duplicate automatic entry at database level', function () {
    BudgetEntry::create([
        'project_id' => $this->project->id, 'created_by' => $this->user->id, 'type' => 'engagement',
        'category' => 'X', 'label' => 'a', 'amount' => 1, 'entry_date' => now()->toDateString(),
        'source_type' => 'purchase_order', 'source_id' => 42,
    ]);

    expect(fn () => BudgetEntry::create([
        'project_id' => $this->project->id, 'created_by' => $this->user->id, 'type' => 'engagement',
        'category' => 'X', 'label' => 'b', 'amount' => 2, 'entry_date' => now()->toDateString(),
        'source_type' => 'purchase_order', 'source_id' => 42,
    ]))->toThrow(\Illuminate\Database\QueryException::class);
});

// ── Transitions atomiques ───────────────────────────────────────────────────

it('throws StateConflictException when the entity is no longer in the expected state', function () {
    $bdc = finBdc($this->project, $this->user, 100_000, 'soumis');

    // Première transition OK
    Transition::apply($bdc, 'soumis', ['status' => 'approuve']);
    expect($bdc->status)->toBe('approuve');

    // Modèle périmé (une autre requête croit encore que le BDC est « soumis »)
    $stale = PurchaseOrder::find($bdc->id);
    $stale->status = 'soumis';

    expect(fn () => Transition::apply($stale, 'soumis', ['status' => 'approuve']))
        ->toThrow(StateConflictException::class);

    expect($bdc->fresh()->status)->toBe('approuve');
});

it('renders StateConflictException as HTTP 409 on api routes', function () {
    Route::middleware('api')->get('/api/_test/conflict', function () {
        throw new StateConflictException('déjà effectué');
    });

    $this->actingAs($this->user)->getJson('/api/_test/conflict')
        ->assertStatus(409)
        ->assertJsonPath('message', 'déjà effectué');
});

it('returns 422 then leaves a single approval when approve is called twice over http', function () {
    seedPermissions();
    $requester = User::factory()->create([
        'company_id' => $this->company->id,
        'role_id'    => Role::where('name', 'conducteur-travaux')->value('id'),
    ]);
    $bdc = finBdc($this->project, $requester, 100_000, 'soumis'); // approbateur ≠ demandeur (anti auto-approbation)

    $this->actingAs($this->user)->patchJson("/api/purchase-orders/{$bdc->id}/approve")->assertOk();
    $this->actingAs($this->user)->patchJson("/api/purchase-orders/{$bdc->id}/approve")->assertStatus(422);

    expect(BudgetEntry::where('type', 'engagement')->count())->toBe(1);
});

// ── Snapshots IA alignés sur la source canonique ────────────────────────────

it('builds snapshots from the canonical financial metrics, not raw budget_entries', function () {
    $bdc = finBdc($this->project, $this->user, 1_000_000);
    event(new BdcApproved($bdc, $this->user));
    finInvoice($this->project, $this->user, $bdc, 250_000, 'payee');

    // Écriture manuelle « paiement » hors facture : ne doit PAS gonfler le réalisé du snapshot
    BudgetEntry::create([
        'project_id' => $this->project->id, 'created_by' => $this->user->id, 'type' => 'paiement',
        'category' => 'Autre', 'label' => 'saisie libre', 'amount' => 9_999_999, 'entry_date' => now()->toDateString(),
    ]);

    Artisan::call('ai:build-snapshots');

    $snap = ProjectSnapshot::where('project_id', $this->project->id)->first();
    expect($snap)->not->toBeNull()
        ->and((float) $snap->budget_realise)->toBe(250_000.0)
        ->and((float) $snap->budget_previsionnel)->toBe(10_000_000.0)
        ->and((int) $snap->health_score)->toBeLessThanOrEqual(100);
});

// ── Réconciliation ──────────────────────────────────────────────────────────

it('reconciles a drifted engagement back to its source amount', function () {
    $bdc = finBdc($this->project, $this->user, 1_000_000);
    event(new BdcApproved($bdc, $this->user));

    BudgetEntry::where('source_type', 'purchase_order')->where('source_id', $bdc->id)->update(['amount' => 123]);

    Artisan::call('budget:reconcile', ['--dry-run' => true]);
    expect((float) BudgetEntry::where('source_id', $bdc->id)->value('amount'))->toBe(123.0);

    Artisan::call('budget:reconcile');
    expect((float) BudgetEntry::where('source_id', $bdc->id)->value('amount'))->toBe(1_000_000.0);
});
