<?php

namespace App\Listeners;

use App\Events\InvoicePaid;
use App\Models\BudgetEntry;
use App\Models\PurchaseOrder;

class CreateBudgetPaymentOnInvoicePaid
{
    public function handle(InvoicePaid $event): void
    {
        $invoice = $event->invoice;
        $project = $invoice->project;

        if (! $project) {
            return;
        }

        BudgetEntry::create([
            'project_id'  => $invoice->project_id,
            'created_by'  => $event->payer->id,
            'type'        => 'paiement',
            'category'    => $invoice->category,
            'label'       => "Facture #{$invoice->reference}",
            'amount'      => $invoice->amount_ht,
            'entry_date'  => $invoice->paid_date ?? now()->toDateString(),
            'note'        => "Paiement auto-enregistré – facture #{$invoice->reference}",
        ]);

        // Remove the BDC engagement entry to avoid double-counting.
        if ($invoice->purchase_order_id) {
            $bdc = PurchaseOrder::find($invoice->purchase_order_id);
            if ($bdc?->engagement_entry_id) {
                BudgetEntry::find($bdc->engagement_entry_id)?->delete();
                $bdc->updateQuietly(['engagement_entry_id' => null]);
            }
        }
    }
}
