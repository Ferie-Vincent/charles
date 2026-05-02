<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Invoice extends Model
{
    protected $fillable = [
        'project_id', 'supplier_id', 'created_by',
        'reference', 'category', 'amount_ht', 'amount_ttc',
        'status', 'invoice_date', 'due_date', 'paid_date', 'note',
    ];

    protected $casts = [
        'amount_ht'    => 'float',
        'amount_ttc'   => 'float',
        'invoice_date' => 'date',
        'due_date'     => 'date',
        'paid_date'    => 'date',
    ];

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
