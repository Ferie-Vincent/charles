<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Task extends Model
{
    protected $fillable = [
        'company_id', 'assigned_to', 'assigned_by',
        'title', 'detail', 'priority', 'role_target',
        'project_code', 'status', 'source', 'due_date', 'alert_key',
    ];

    public function assignee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_by');
    }

    public function meeting(): HasOne
    {
        return $this->hasOne(MeetingInvitation::class);
    }
}
