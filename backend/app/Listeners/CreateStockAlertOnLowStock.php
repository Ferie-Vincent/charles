<?php

namespace App\Listeners;

use App\Events\StockBelowThreshold;
use App\Models\ProjectActivity;
use Illuminate\Support\Facades\Log;

class CreateStockAlertOnLowStock
{
    public function handle(StockBelowThreshold $event): void
    {
        $item = $event->item;

        Log::warning("Stock bas: {$item->name} (réf: {$item->reference}) — {$item->quantity} {$item->unit} restants (seuil: {$item->threshold})");

        if (! $event->projectId) {
            return;
        }

        try {
            ProjectActivity::create([
                'project_id'  => $event->projectId,
                'user_id'     => null,
                'type'        => 'stock_bas',
                'description' => "Alerte stock : {$item->name} sous le seuil ({$item->quantity} {$item->unit} restants, seuil : {$item->threshold})",
                'metadata'    => [
                    'stock_item_id' => $item->id,
                    'name'          => $item->name,
                    'quantity'      => $item->quantity,
                    'threshold'     => $item->threshold,
                    'unit'          => $item->unit,
                ],
            ]);
        } catch (\Throwable $e) {
            Log::warning("CreateStockAlertOnLowStock: could not create ProjectActivity: {$e->getMessage()}");
        }
    }
}
