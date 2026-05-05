<?php

namespace App\Listeners;

use App\Events\InvoiceValidated;
use App\Models\BudgetEntry;
use App\Models\PurchaseOrder;

class ClearBdcEngagementOnInvoiceValidated
{
    public function handle(InvoiceValidated $event): void
    {
        $invoice = $event->invoice;

        if (! $invoice->purchase_order_id) {
            return;
        }

        $bdc = PurchaseOrder::find($invoice->purchase_order_id);

        if ($bdc?->engagement_entry_id) {
            $entry = BudgetEntry::find($bdc->engagement_entry_id);
            if ($entry) {
                $remaining = (float) $entry->amount - $invoice->amount_ht;
                if ($remaining <= 0) {
                    $entry->delete();
                    $bdc->updateQuietly(['engagement_entry_id' => null]);
                } else {
                    $entry->updateQuietly(['amount' => round($remaining, 2)]);
                }
            }
        }
    }
}
