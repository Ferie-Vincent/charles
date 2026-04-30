<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DailyLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'project_id',
        'user_id',
        'log_date',
        'weather',
        'workers_count',
        'progress_percent',
        'has_incident',
        'incident_type',
        'equipment_status',
        'materials_received',
    ];

    protected function casts(): array
    {
        return [
            'log_date' => 'date:Y-m-d',
            'progress_percent' => 'float',
            'has_incident' => 'boolean',
            'materials_received' => 'array',
        ];
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
