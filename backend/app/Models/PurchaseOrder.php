<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PurchaseOrder extends Model
{
    protected $fillable = [
        'company_id', 'requested_by', 'supplier_id', 'project_id', 'approved_by',
        'reference', 'status', 'items', 'total_amount',
        'expected_delivery', 'approved_at', 'rejection_reason', 'notes',
        'delivery_note_path', 'delivery_photos', 'reception_notes', 'received_at',
    ];

    protected $casts = [
        'items'             => 'array',
        'delivery_photos'   => 'array',
        'total_amount'      => 'float',
        'expected_delivery' => 'date',
        'approved_at'       => 'datetime',
        'received_at'       => 'datetime',
    ];

    public function company(): BelongsTo    { return $this->belongsTo(Company::class); }
    public function requester(): BelongsTo  { return $this->belongsTo(User::class, 'requested_by'); }
    public function supplier(): BelongsTo   { return $this->belongsTo(Supplier::class); }
    public function project(): BelongsTo    { return $this->belongsTo(Project::class); }
    public function approver(): BelongsTo   { return $this->belongsTo(User::class, 'approved_by'); }
}
