<?php

namespace App\Listeners;

use App\Events\InvoicePaid;
use App\Models\BudgetEntry;

/**
 * Facture payée → écriture de paiement (piste d'audit).
 * Idempotent par (invoice, id, paiement). Note : le « réalisé » canonique est calculé
 * depuis invoices.status = payee (ProjectFinancialMetricsService), pas depuis cette ligne.
 */
class CreateBudgetPaymentOnInvoicePaid
{
    public function handle(InvoicePaid $event): void
    {
        $invoice = $event->invoice;

        if (! $invoice->project_id) {
            return;
        }

        BudgetEntry::upsertForSource(BudgetEntry::SOURCE_INVOICE, $invoice->id, 'paiement', [
            'project_id' => $invoice->project_id,
            'created_by' => $event->payer->id,
            'category'   => $invoice->category,
            'label'      => "Facture #{$invoice->reference}",
            'amount'     => $invoice->amount_ht,
            'entry_date' => $invoice->paid_date ?? now()->toDateString(),
            'note'       => "Paiement auto-enregistré – facture #{$invoice->reference}",
        ]);
    }
}
