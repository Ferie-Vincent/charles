<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AiFeedbackLog extends Model
{
    protected $fillable = [
        'user_id', 'company_id', 'feature', 'project_id',
        'rating', 'comment', 'ai_output_excerpt', 'model_used',
    ];

    protected $casts = [
        'ai_output_excerpt' => 'array',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }
}
