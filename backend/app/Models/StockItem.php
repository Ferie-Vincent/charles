<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class StockItem extends Model
{
    protected $fillable = [
        'company_id', 'created_by', 'name', 'reference',
        'category', 'unit', 'quantity', 'threshold', 'location', 'notes',
    ];

    protected $casts = ['quantity' => 'float', 'threshold' => 'float'];

    public function company(): BelongsTo   { return $this->belongsTo(Company::class); }
    public function creator(): BelongsTo   { return $this->belongsTo(User::class, 'created_by'); }
    public function movements(): HasMany   { return $this->hasMany(StockMovement::class); }

    public function getIsLowAttribute(): bool
    {
        return $this->threshold > 0 && $this->quantity <= $this->threshold;
    }
}
