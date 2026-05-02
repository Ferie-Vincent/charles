<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Supplier extends Model
{
    protected $fillable = [
        'company_id', 'project_id', 'created_by',
        'category', 'name', 'contact_name',
        'phone', 'email', 'contract_amount', 'notes',
    ];

    protected $casts = ['contract_amount' => 'float'];

    public function company(): BelongsTo  { return $this->belongsTo(Company::class); }
    public function project(): BelongsTo  { return $this->belongsTo(Project::class); }
    public function creator(): BelongsTo  { return $this->belongsTo(User::class, 'created_by'); }

    public function invoices(): HasMany
    {
        return $this->hasMany(Invoice::class);
    }
}
