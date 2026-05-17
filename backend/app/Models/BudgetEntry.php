<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BudgetEntry extends Model
{
    protected $fillable = [
        'project_id', 'created_by', 'type', 'category',
        'label', 'amount', 'entry_date', 'note', 'situation_travaux_id',
    ];

    protected $casts = [
        'amount'     => 'decimal:2',
        'entry_date' => 'date',
    ];

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function demandeBesoin(): \Illuminate\Database\Eloquent\Relations\HasOne
    {
        return $this->hasOne(DemandeBesoin::class, 'budget_entry_id');
    }

    public function situationTravaux(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(SituationTravaux::class, 'situation_travaux_id');
    }
}
