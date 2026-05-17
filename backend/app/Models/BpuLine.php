<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BpuLine extends Model
{
    protected $fillable = ['bpu_version_id', 'lot', 'designation', 'unite', 'prix_unitaire', 'ordre'];
    protected $casts = ['prix_unitaire' => 'decimal:2'];

    public function bpuVersion(): BelongsTo { return $this->belongsTo(BpuVersion::class); }
}
