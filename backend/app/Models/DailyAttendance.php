<?php

namespace App\Models;

use Carbon\Carbon;
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

    public function getIsDimancheAttribute(): bool
    {
        return Carbon::parse($this->log_date)->isSunday();
    }

    public function getIsJourFerieAttribute(): bool
    {
        $date   = Carbon::parse($this->log_date);
        $mmdd   = $date->format('m-d');
        $ymmdd  = $date->format('Y-m-d');
        return array_key_exists($mmdd, config('btp.jours_feries', []))
            || array_key_exists($ymmdd, config('btp.jours_feries_annee', []));
    }

    public function getMajorationTauxAttribute(): float
    {
        if ($this->is_dimanche || $this->is_jour_ferie) {
            return config('btp.majorations_heures_sup.dimanche', 2.0);
        }
        if (($this->heures_sup ?? 0) > 8) {
            return config('btp.majorations_heures_sup.semaine_8', 1.5);
        }
        return config('btp.majorations_heures_sup.semaine', 1.25);
    }

    protected $appends = ['is_present', 'is_dimanche', 'is_jour_ferie', 'majoration_taux'];
}
