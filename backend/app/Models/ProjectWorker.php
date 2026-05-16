<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ProjectWorker extends Model
{
    use HasFactory;

    protected $fillable = [
        'project_id',
        'company_id',
        'name',
        'trade',
        'phone',
        'is_active',
        'statut',
        'date_start',
        'date_end',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'date_start' => 'date:Y-m-d',
        'date_end' => 'date:Y-m-d',
    ];

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

    public function getIsActiveAttribute(): bool
    {
        return $this->statut === 'active';
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function attendances(): HasMany
    {
        return $this->hasMany(DailyAttendance::class, 'worker_id');
    }
}
