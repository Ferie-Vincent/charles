<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class StockItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'company_id', 'created_by', 'name', 'reference',
        'category', 'unit', 'quantity', 'threshold', 'unit_cost', 'location', 'notes',
    ];

    protected $casts = ['quantity' => 'float', 'threshold' => 'float', 'unit_cost' => 'float'];

    public function company(): BelongsTo   { return $this->belongsTo(Company::class); }
    public function creator(): BelongsTo   { return $this->belongsTo(User::class, 'created_by'); }
    public function movements(): HasMany   { return $this->hasMany(StockMovement::class); }

    public function getIsLowAttribute(): bool
    {
        return $this->threshold > 0 && $this->quantity <= $this->threshold;
    }

    /** Valeur comptable du stock restant (quantité × PU moyen pondéré). */
    public function getStockValueAttribute(): float
    {
        return round((float) $this->quantity * (float) $this->unit_cost, 2);
    }

    // =========================================================================
    // Valorisation — prix unitaire moyen pondéré (PMP)
    // =========================================================================

    /**
     * Nouveau PMP après une entrée de `qty` au prix `unitCost`.
     * PMP' = (stock × PMP + qty × PU) / (stock + qty). Une entrée non valorisée (PU null) garde le PMP.
     *
     * À appeler AVANT d'incrémenter la quantité (sinon la pondération est fausse).
     */
    public function weightedUnitCostAfterEntry(float $qty, ?float $unitCost): float
    {
        if ($unitCost === null || $qty <= 0) {
            return (float) $this->unit_cost;
        }

        $currentQty  = max(0.0, (float) $this->quantity);
        $currentCost = (float) $this->unit_cost;

        if ($currentQty <= 0 || $currentCost <= 0) {
            return round($unitCost, 2);
        }

        return round(($currentQty * $currentCost + $qty * $unitCost) / ($currentQty + $qty), 2);
    }
}
