<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GeneralExpense extends Model
{
    protected $fillable = [
        'company_id', 'created_by', 'category',
        'label', 'amount', 'expense_date', 'paid_by', 'notes',
    ];

    protected $casts = ['expense_date' => 'date', 'amount' => 'float'];

    public function company(): BelongsTo  { return $this->belongsTo(Company::class); }
    public function creator(): BelongsTo  { return $this->belongsTo(User::class, 'created_by'); }
}
