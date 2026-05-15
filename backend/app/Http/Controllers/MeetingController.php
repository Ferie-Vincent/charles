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

        DB::table('meeting_invitation_users')
            ->where('rsvp_token', $token)
            ->update(['status' => $status, 'updated_at' => now()]);

        $label = $status === 'accepted' ? '✓ Présence confirmée' : '✗ Absence notifiée';

        return response(
            "<html><body style='font-family:sans-serif;text-align:center;padding:60px'>
              <h2>{$label}</h2><p>Vous pouvez fermer cette fenêtre.</p>
            </body></html>",
            200,
            ['Content-Type' => 'text/html']
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
        return match ($alertType) {
            'overdue', 'planning_lag' =>
                "- [ ] Réévaluer les jalons avec le conducteur\n- [ ] Mettre à jour le planning\n- [ ] Définir plan de rattrapage\n- [ ] Rédiger compte-rendu réunion",
            'open_incident' =>
                "- [ ] Vérifier PV de clôture incident\n- [ ] Action corrective signée\n- [ ] Mise à jour registre QSE",
            'no_journal' =>
                "- [ ] Reprendre la saisie des journaux de chantier\n- [ ] Rappeler chef chantier\n- [ ] Vérifier conformité reporting",
            'health_critical' =>
                "- [ ] Analyser les 4 composantes du score santé\n- [ ] Plan correctif prioritaire\n- [ ] Point direction sous 48h",
            default => null,
        };
    }
}
