<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProjectReport extends Model
{
    protected $fillable = ['project_id', 'filename', 'path', 'week_of', 'size_bytes', 'type'];

    protected $casts = ['week_of' => 'date'];

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }
}
