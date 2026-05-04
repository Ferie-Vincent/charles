<?php

namespace App\Listeners;

use App\Events\DemandeBesoinDelivered;
use App\Models\StockItem;
use App\Models\StockMovement;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class CreateStockEntryOnDemandeBesoinDelivered
{
    private const STOCKABLE_CATEGORIES = ['materiaux', 'equipement'];

    private const STOCK_CATEGORY_MAP = [
        'materiaux'  => 'materiaux',
        'equipement' => 'equipement',
    ];

    public function handle(DemandeBesoinDelivered $event): void
    {
        $demande = $event->demande;

        if (! in_array($demande->category, self::STOCKABLE_CATEGORIES, true)) {
            return;
        }

        $qty = (float) ($demande->quantity ?? 0);
        if ($qty <= 0) {
            return;
        }

        try {
            DB::transaction(function () use ($demande, $event, $qty) {
                $stockItem = StockItem::where('company_id', $demande->company_id)
                    ->whereRaw('LOWER(TRIM(name)) = ?', [strtolower(trim($demande->title))])
                    ->first();

                if (! $stockItem) {
                    $stockItem = StockItem::create([
                        'company_id' => $demande->company_id,
                        'created_by' => $event->deliveredBy->id,
                        'name'       => $demande->title,
                        'category'   => self::STOCK_CATEGORY_MAP[$demande->category],
                        'unit'       => $demande->unit ?? 'u',
                        'quantity'   => 0,
                        'threshold'  => 0,
                    ]);
                }

                StockMovement::create([
                    'stock_item_id' => $stockItem->id,
                    'created_by'    => $event->deliveredBy->id,
                    'project_id'    => $demande->project_id,
                    'type'          => 'entree',
                    'quantity'      => $qty,
                    'reason'        => "Livraison demande #{$demande->id} – {$demande->title}",
                    'movement_date' => now()->toDateString(),
                    'notes'         => "Auto-créé à la livraison de la demande de besoin.",
                ]);

                $stockItem->increment('quantity', $qty);
            });
        } catch (\Throwable $e) {
            Log::warning("CreateStockEntryOnDemandeBesoinDelivered failed for demande #{$demande->id}: {$e->getMessage()}");
        }
    }
}
