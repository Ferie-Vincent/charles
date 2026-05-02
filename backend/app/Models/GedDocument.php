<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GedDocument extends Model
{
    protected $fillable = [
        'company_id', 'project_id', 'uploaded_by',
        'name', 'original_name', 'path', 'mime_type', 'size_bytes',
        'type', 'description',
    ];

    protected $casts = [
        'size_bytes' => 'integer',
    ];

    public function company(): BelongsTo   { return $this->belongsTo(Company::class); }
    public function project(): BelongsTo   { return $this->belongsTo(Project::class); }
    public function uploader(): BelongsTo  { return $this->belongsTo(User::class, 'uploaded_by'); }
}
