<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DemandeBesoin extends Model
{
    protected $table = 'demandes_besoins';

    protected $fillable = [
        'company_id', 'project_id', 'requested_by',
        'title', 'description', 'category', 'quantity', 'unit',
        'estimated_cost', 'urgency', 'status',
        'approved_by', 'approved_at', 'rejection_reason',
        'prepared_by', 'prepared_at',
        'delivered_at', 'delivered_by',
        'actual_cost', 'recorded_by', 'recorded_at', 'budget_entry_id',
        'notes',
    ];

    protected $casts = [
        'estimated_cost' => 'float',
        'actual_cost'    => 'float',
        'quantity'       => 'float',
        'approved_at'    => 'datetime',
        'prepared_at'    => 'datetime',
        'delivered_at'   => 'datetime',
        'recorded_at'    => 'datetime',
    ];

    public function project(): BelongsTo       { return $this->belongsTo(Project::class); }
    public function requester(): BelongsTo     { return $this->belongsTo(User::class, 'requested_by'); }
    public function approver(): BelongsTo      { return $this->belongsTo(User::class, 'approved_by'); }
    public function preparer(): BelongsTo      { return $this->belongsTo(User::class, 'prepared_by'); }
    public function deliverer(): BelongsTo     { return $this->belongsTo(User::class, 'delivered_by'); }
    public function recorder(): BelongsTo      { return $this->belongsTo(User::class, 'recorded_by'); }
    public function budgetEntry(): BelongsTo   { return $this->belongsTo(BudgetEntry::class); }
}
