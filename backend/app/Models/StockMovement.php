<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StockMovement extends Model
{
    protected $fillable = [
        'stock_item_id', 'created_by', 'project_id',
        'type', 'quantity', 'reason', 'movement_date', 'notes',
    ];

    protected $casts = ['quantity' => 'float', 'movement_date' => 'date'];

    public function stockItem(): BelongsTo { return $this->belongsTo(StockItem::class); }
    public function creator(): BelongsTo   { return $this->belongsTo(User::class, 'created_by'); }
    public function project(): BelongsTo   { return $this->belongsTo(Project::class); }
}
