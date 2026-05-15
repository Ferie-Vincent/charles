<?php

namespace App\Http\Controllers;

use App\Models\MeetingInvitation;
use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use App\Notifications\MeetingInvitedNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Str;

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
            'alert_key'     => 'nullable|string|max:100',
            'alert_type'    => 'nullable|string|max:60',
            'alert_detail'  => 'nullable|string|max:500',
        ]);

        $project = Project::where('company_id', $request->user()->company_id)
            ->where(fn($q) => $q->where('code', $data['project_code'])
                ->orWhere('name', 'like', '%'.$data['project_code'].'%'))
            ->firstOrFail();

        $invitees = User::whereIn('id', $data['invitee_ids'])
            ->where('company_id', $request->user()->company_id)
            ->get();

        // Generate RSVP tokens before transaction
        $tokens = $invitees->mapWithKeys(fn($u) => [$u->id => Str::uuid()->toString()]);

        // Atomic: task + meeting + invitees — notifications sent after commit
        [$task, $meeting] = DB::transaction(function () use ($data, $project, $request, $invitees, $tokens) {
            $checklist = $this->buildChecklist($data['alert_type'] ?? null);

            $task = Task::create([
                'title'        => $data['title'],
                'detail'       => $checklist ?: ($data['notes'] ?? null),
                'priority'     => 'urgent',
                'status'       => 'todo',
                'source'       => 'ai',
                'project_code' => $project->code ?? $data['project_code'],
                'role_target'  => 'direction',
                'alert_key'    => $data['alert_key'] ?? null,
                'assigned_by'  => $request->user()->id,
                'company_id'   => $request->user()->company_id,
            ]);

            $meeting = MeetingInvitation::create([
                'company_id'   => $request->user()->company_id,
                'project_id'   => $project->id,
                'task_id'      => $task->id,
                'organized_by' => $request->user()->id,
                'title'        => $data['title'],
                'scheduled_at' => $data['scheduled_at'],
                'location'     => $data['location'] ?? null,
                'notes'        => $data['notes'] ?? null,
                'alert_type'   => $data['alert_type'] ?? null,
                'alert_message'=> $data['alert_detail'] ?? null,
            ]);

            $attachData = $invitees->mapWithKeys(fn($u) => [
                $u->id => ['rsvp_token' => $tokens[$u->id]],
            ])->all();
            $meeting->invitees()->attach($attachData);

            return [$task, $meeting];
        });

        $meeting->load('project', 'organizer');

        // Send notifications outside transaction — failures don't roll back the meeting
        $toNotify = $invitees->filter(fn($u) => $u->id !== $request->user()->id);
        try {
            $toNotify->each(function (User $user) use ($meeting, $data, $tokens) {
                $user->notify(new MeetingInvitedNotification(
                    meeting:      $meeting,
                    rsvpToken:    $tokens[$user->id],
                    alertMessage: $data['alert_detail'] ?? '',
                    alertType:    $data['alert_type'] ?? '',
                ));
            });
        } catch (\Throwable $e) {
            Log::error('Meeting notifications dispatch failed', [
                'meeting_id' => $meeting->id,
                'error'      => $e->getMessage(),
            ]);
        }

        return response()->json([
            'meeting' => $meeting->load('invitees:id,name'),
            'task'    => $task->load('creator:id,name', 'assignee:id,name'),
        ], 201);
    }

    public function rsvpViaToken(string $token, string $status): Response
    {
        if (! in_array($status, ['accepted', 'declined'])) {
            abort(400, 'Invalid RSVP status.');
        }

        $pivot = DB::table('meeting_invitation_users')
            ->where('rsvp_token', $token)
            ->first();

        abort_if(! $pivot, 404, 'Invitation introuvable.');

        $meeting = MeetingInvitation::find($pivot->meeting_invitation_id);
        abort_if(! $meeting || $meeting->scheduled_at->isPast(), 410, 'Cette réunion est déjà passée.');

        DB::table('meeting_invitation_users')
            ->where('rsvp_token', $token)
            ->update(['status' => $status, 'updated_at' => now()]);

        $label   = $status === 'accepted' ? '✓ Présence confirmée' : '✗ Absence notifiée';
        $date    = $meeting->scheduled_at->locale('fr')->isoFormat('dddd D MMMM [à] HH:mm');
        $project = optional($meeting->project)->name ?? '';
        $appUrl  = config('app.url');

        return response(
            "<!DOCTYPE html><html lang='fr'><head><meta charset='UTF-8'>
             <meta name='viewport' content='width=device-width,initial-scale=1'>
             <title>RSVP — Chantier Platform</title>
             <style>
               body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;background:#f8fafc;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}
               .card{background:#fff;border-radius:12px;padding:48px 40px;max-width:440px;width:90%;box-shadow:0 4px 24px rgba(0,0,0,.08);text-align:center}
               .icon{font-size:48px;margin-bottom:16px}
               h2{margin:0 0 8px;font-size:22px;color:#111828}
               .meta{color:#64748b;font-size:14px;margin-bottom:24px;line-height:1.6}
               .btn{display:inline-block;background:#2F60B0;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:15px}
             </style></head>
             <body><div class='card'>
               <div class='icon'>" . ($status === 'accepted' ? '✅' : '👋') . "</div>
               <h2>{$label}</h2>
               <div class='meta'>" . ($project ? "<strong>{$project}</strong><br>" : '') . "{$date}</div>
               <a class='btn' href='{$appUrl}'>Voir dans l'app →</a>
             </div></body></html>",
            200,
            ['Content-Type' => 'text/html; charset=UTF-8']
        );
    }

    public function respond(Request $request, int $meetingId): JsonResponse
    {
        $data = $request->validate(['status' => 'required|in:accepted,declined,invited']);

        $updated = DB::table('meeting_invitation_users')
            ->where('meeting_invitation_id', $meetingId)
            ->where('user_id', $request->user()->id)
            ->update(['status' => $data['status'], 'updated_at' => now()]);

        abort_if(! $updated, 404, 'Invitation introuvable.');

        return response()->json(['status' => $data['status']]);
    }

    public function rsvpStatus(Request $request, int $meetingId): JsonResponse
    {
        $meeting = MeetingInvitation::where('id', $meetingId)
            ->where('company_id', $request->user()->company_id)
            ->firstOrFail();

        $rows = DB::table('meeting_invitation_users')
            ->join('users', 'users.id', '=', 'meeting_invitation_users.user_id')
            ->where('meeting_invitation_users.meeting_invitation_id', $meetingId)
            ->select('users.id', 'users.name', 'meeting_invitation_users.status')
            ->get();

        $summary = [
            'accepted' => $rows->where('status', 'accepted')->count(),
            'declined' => $rows->where('status', 'declined')->count(),
            'invited'  => $rows->where('status', 'invited')->count(),
            'invitees' => $rows->values(),
        ];

        return response()->json($summary);
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
                'read'       => ! is_null($n->read_at),
                'created_at' => $n->created_at->toIso8601String(),
            ]);

        return response()->json([
            'notifications' => $notifications,
            'unread'        => $request->user()->unreadNotifications()->count(),
        ]);
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

    private function buildChecklist(?string $alertType): ?string
    {
        if (! $alertType) {
            return null;
        }

        // Generic 3-item checklist — simplify before measuring usage then refine
        return "- [ ] Définir les actions correctives avec les responsables\n"
             . "- [ ] Assigner les tâches et fixer les délais\n"
             . "- [ ] Planifier un point de vérification dans 48h";
    }
}
