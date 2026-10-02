<?php

namespace App\Listeners;

use App\Events\InvoiceValidated;
use App\Models\BudgetEntry;
use App\Models\PurchaseOrder;

/**
 * Facture validée sur un BDC → l'engagement restant du BDC diminue d'autant.
 * Recalcul convergent (pas de décrément cumulatif).
 */
class ClearBdcEngagementOnInvoiceValidated
{
    public function handle(InvoiceValidated $event): void
    {
        if (! $event->invoice->purchase_order_id) {
            return;
        }

        $bdc = PurchaseOrder::find($event->invoice->purchase_order_id);
        if ($bdc) {
            BudgetEntry::syncBdcEngagement($bdc, $event->validator);
        }
    }
}
