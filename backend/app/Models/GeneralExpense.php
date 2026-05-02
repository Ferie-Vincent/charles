<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GeneralExpense extends Model
{
    protected $fillable = [
        'company_id', 'created_by', 'category',
        'label', 'amount', 'expense_date', 'paid_by', 'notes',
        'status', 'approver_id', 'approved_at', 'rejection_reason',
    ];

    protected $casts = [
        'expense_date' => 'date',
        'amount'       => 'float',
        'approved_at'  => 'datetime',
    ];

    public function company(): BelongsTo  { return $this->belongsTo(Company::class); }
    public function creator(): BelongsTo  { return $this->belongsTo(User::class, 'created_by'); }
    public function approver(): BelongsTo { return $this->belongsTo(User::class, 'approver_id'); }
}
