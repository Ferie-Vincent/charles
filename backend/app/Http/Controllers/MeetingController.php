<?php

namespace App\Http\Controllers;

use App\Models\MeetingInvitation;
use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use App\Notifications\MeetingInvitedNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Notification;

class MeetingController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'project_code'  => 'required|string',
            'title'         => 'required|string|max:255',
            'scheduled_at'  => 'required|date|after:now',
            'location'      => 'nullable|string|max:255',
            'notes'         => 'nullable|string|max:1000',
            'invitee_ids'   => 'required|array|min:1',
            'invitee_ids.*' => 'integer|exists:users,id',
            'alert_type'    => 'nullable|string',
            'alert_detail'  => 'nullable|string',
        ]);

        $project = Project::where('company_id', $request->user()->company_id)
            ->where(function ($q) use ($data) {
                $q->where('code', $data['project_code'])
                  ->orWhere('name', 'like', '%'.$data['project_code'].'%');
            })
            ->firstOrFail();

        // Create linked task
        $task = Task::create([
            'title'        => $data['title'],
            'detail'       => $data['notes'] ?? null,
            'priority'     => 'urgent',
            'status'       => 'todo',
            'source'       => 'ai',
            'project_code' => $project->code ?? $data['project_code'],
            'role_target'  => 'direction',
            'assigned_by'  => $request->user()->id,
            'company_id'   => $request->user()->company_id,
        ]);

        // Create meeting invitation
        $meeting = MeetingInvitation::create([
            'company_id'   => $request->user()->company_id,
            'project_id'   => $project->id,
            'task_id'      => $task->id,
            'organized_by' => $request->user()->id,
            'title'        => $data['title'],
            'scheduled_at' => $data['scheduled_at'],
            'location'     => $data['location'] ?? null,
            'notes'        => $data['notes'] ?? null,
        ]);

        // Attach invitees
        $invitees = User::whereIn('id', $data['invitee_ids'])
            ->where('company_id', $request->user()->company_id)
            ->get();

        $meeting->invitees()->attach($invitees->pluck('id'));

        // Load relations for notification
        $meeting->load('project', 'organizer');

        // Send notifications (exclude the organizer)
        $toNotify = $invitees->filter(fn($u) => $u->id !== $request->user()->id);
        Notification::send($toNotify, new MeetingInvitedNotification($meeting));

        return response()->json([
            'meeting' => $meeting->load('invitees:id,name'),
            'task'    => $task->load('creator:id,name', 'assignee:id,name'),
        ], 201);
    }

    public function userNotifications(Request $request): JsonResponse
    {
        $notifications = $request->user()
            ->notifications()
            ->latest()
            ->take(20)
            ->get()
            ->map(fn($n) => [
                'id'         => $n->id,
                'type'       => $n->data['type'] ?? 'general',
                'data'       => $n->data,
                'read'       => !is_null($n->read_at),
                'created_at' => $n->created_at->toIso8601String(),
            ]);

        $unread = $request->user()->unreadNotifications()->count();

        return response()->json(['notifications' => $notifications, 'unread' => $unread]);
    }

    public function markRead(Request $request, string $id): JsonResponse
    {
        $request->user()->notifications()->where('id', $id)->update(['read_at' => now()]);
        return response()->json(['ok' => true]);
    }

    public function markAllRead(Request $request): JsonResponse
    {
        $request->user()->unreadNotifications->markAsRead();
        return response()->json(['ok' => true]);
    }
}
