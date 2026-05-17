<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DqeVersion extends Model
{
    protected $fillable = [
        'project_id', 'created_by', 'version_number',
        'name', 'status', 'total_ht', 'notes', 'rejection_reason',
        'bpu_version_id',
    ];

    protected $casts = [
        'total_ht'       => 'float',
        'version_number' => 'integer',
    ];

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function lines(): HasMany
    {
        return $this->hasMany(DqeLine::class, 'dqe_version_id')
            ->orderBy('lot')
            ->orderBy('ordre')
            ->orderBy('id');
    }

    public function recomputeTotal(): void
    {
        $this->total_ht = (float) $this->lines()->sum('montant_ht');
        $this->saveQuietly();
    }

    public function bpuVersion(): BelongsTo
    {
        return $this->belongsTo(BpuVersion::class);
    }
}
