<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RolePermission extends Model
{
    protected $fillable = ['company_id', 'role_id', 'feature', 'enabled'];

    protected $casts = ['enabled' => 'boolean'];

    public function role(): BelongsTo
    {
        return $this->belongsTo(Role::class);
    }
}
