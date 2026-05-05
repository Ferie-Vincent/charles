<?php

namespace App\Listeners;

use App\Events\InvoiceDisputee;
use App\Models\BudgetEntry;
use App\Models\PurchaseOrder;

class RestoreBdcEngagementOnInvoiceDisputee
{
    public function handle(InvoiceDisputee $event): void
    {
        // Only restore when coming from validee — that's when engagement was reduced.
        if ($event->from !== 'validee') {
            return;
        }

        $invoice = $event->invoice;

        if (! $invoice->purchase_order_id) {
            return;
        }

        $bdc = PurchaseOrder::find($invoice->purchase_order_id);

        if (! $bdc) {
            return;
        }

        $restoreAmount = (float) $invoice->amount_ht;

        if ($bdc->engagement_entry_id) {
            BudgetEntry::find($bdc->engagement_entry_id)?->increment('amount', $restoreAmount);
        } else {
            // Entry was fully consumed and deleted — recreate it.
            $entry = BudgetEntry::create([
                'project_id'  => $bdc->project_id,
                'created_by'  => $event->by->id,
                'type'        => 'engagement',
                'category'    => 'BDC',
                'label'       => "Restauration engagement BDC #{$bdc->reference}",
                'amount'      => round($restoreAmount, 2),
                'entry_date'  => now()->toDateString(),
                'note'        => "Engagement restauré — facture #{$invoice->reference} passée en litige",
            ]);
            $bdc->updateQuietly(['engagement_entry_id' => $entry->id]);
        }
    }
}
