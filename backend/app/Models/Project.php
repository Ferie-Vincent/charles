<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Project extends Model
{
    use HasFactory;

    protected $fillable = [
        'company_id',
        'code',
        'name',
        'status',
        'location',
        'latitude',
        'longitude',
        'budget_amount',
        'target_progress',
        'start_date',
        'end_date',
    ];

    protected function casts(): array
    {
        return [
            'budget_amount'   => 'decimal:2',
            'target_progress' => 'integer',
            'start_date'      => 'date',
            'end_date'        => 'date',
            'latitude'        => 'float',
            'longitude'       => 'float',
        ];
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function members(): HasMany
    {
        return $this->hasMany(ProjectMember::class);
    }

    public function activities(): HasMany
    {
        return $this->hasMany(ProjectActivity::class);
    }

    public function dailyLogs(): HasMany
    {
        return $this->hasMany(DailyLog::class);
    }

    public function incidents(): HasMany
    {
        return $this->hasMany(Incident::class);
    }

    public function budgetEntries(): HasMany
    {
        return $this->hasMany(BudgetEntry::class);
    }

    public function reports(): HasMany
    {
        return $this->hasMany(ProjectReport::class);
    }
}
