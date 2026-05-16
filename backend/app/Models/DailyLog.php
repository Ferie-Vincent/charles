<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DailyLog extends Model
{
    use HasFactory;

    // workers_count = effectif total site (journal quotidien, inclut sous-traitants/visiteurs).
    // Pour le registre nominatif par ouvrier, utiliser daily_attendance + project_workers.
    // Les deux coexistent : workers_count = vue macro, daily_attendance = vue individuelle.
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
        'notes',
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
