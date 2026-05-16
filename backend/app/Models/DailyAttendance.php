<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DailyAttendance extends Model
{
    protected $table = 'daily_attendance';

    protected $fillable = [
        'project_id',
        'worker_id',
        'company_id',
        'log_date',
        'present',
        'task_assigned',
        'statut',
        'heures_normales',
        'heures_sup',
    ];

    protected $casts = [
        'present'  => 'boolean',
        'log_date' => 'date:Y-m-d',
        'heures_normales' => 'float',
        'heures_sup' => 'float',
    ];

    public function worker(): BelongsTo
    {
        return $this->belongsTo(ProjectWorker::class, 'worker_id');
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function getIsPresentAttribute(): bool
    {
        return in_array($this->statut, ['present', 'demi_journee']);
    }
}
