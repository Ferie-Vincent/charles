<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Company extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'slug',
        'ai_enabled',
        'ai_provider',
        'ai_api_key',
    ];

    protected $casts = [
        'ai_enabled' => 'boolean',
        'ai_api_key' => 'encrypted',
    ];

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }
}
