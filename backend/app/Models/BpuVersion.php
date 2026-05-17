<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class BpuVersion extends Model
{
    protected $fillable = ['project_id', 'company_id', 'name', 'version_number', 'status', 'notes'];

    public function project(): BelongsTo { return $this->belongsTo(Project::class); }
    public function lines(): HasMany     { return $this->hasMany(BpuLine::class)->orderBy('lot')->orderBy('ordre'); }
}
