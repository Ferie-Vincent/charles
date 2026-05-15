<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class MeetingInvitation extends Model
{
    protected $fillable = [
        'company_id',
        'project_id',
        'task_id',
        'organized_by',
        'title',
        'scheduled_at',
        'location',
        'notes',
        'alert_type',
        'alert_message',
        'reminder_sent',
    ];

    protected $casts = [
        'scheduled_at' => 'datetime',
    ];

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function organizer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'organized_by');
    }

    public function task(): BelongsTo
    {
        return $this->belongsTo(Task::class);
    }

    public function invitees(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'meeting_invitation_users')
            ->withPivot('status')
            ->withTimestamps();
    }
}
