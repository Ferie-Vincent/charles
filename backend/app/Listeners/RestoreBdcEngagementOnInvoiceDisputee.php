<?php

namespace App\Listeners;

use App\Events\InvoiceDisputee;
use App\Models\BudgetEntry;
use App\Models\PurchaseOrder;

/**
 * Facture passée en litige → elle sort du facturé, l'engagement BDC remonte.
 * Recalcul convergent : la facture « disputee » n'est plus comptée, point.
 */
class RestoreBdcEngagementOnInvoiceDisputee
{
    public function handle(InvoiceDisputee $event): void
    {
        if (! $event->invoice->purchase_order_id) {
            return;
        }

        $bdc = PurchaseOrder::find($event->invoice->purchase_order_id);
        if ($bdc) {
            BudgetEntry::syncBdcEngagement($bdc, $event->by);
        }
    }
}
