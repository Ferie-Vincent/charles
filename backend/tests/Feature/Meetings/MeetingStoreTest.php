<?php

use App\Models\Company;
use App\Models\MeetingInvitation;
use App\Models\Project;
use App\Models\Role;
use App\Models\Task;
use App\Models\User;
use App\Notifications\MeetingInvitedNotification;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Queue;

function meetingUser(string $roleName = 'direction'): array
{
    $company = Company::factory()->create();
    $role    = Role::firstOrCreate(['name' => $roleName], ['label' => ucfirst($roleName)]);
    $user    = User::factory()->create(['company_id' => $company->id, 'role_id' => $role->id]);
    $project = Project::factory()->create(['company_id' => $company->id, 'status' => 'active']);
    return [$company, $user, $project];
}

it('dispatches MeetingInvitedNotification to queue — not sent synchronously', function () {
    Queue::fake();

    [$company, $organizer, $project] = meetingUser();
    $invitee = User::factory()->create(['company_id' => $company->id, 'role_id' => $organizer->role_id]);

    $this->actingAs($organizer)->postJson('/api/meetings', [
        'project_code' => $project->code,
        'title'        => 'Réunion test',
        'scheduled_at' => now()->addDay()->format('Y-m-d H:i:s'),
        'invitee_ids'  => [$invitee->id],
    ])->assertCreated();

    // ShouldQueue notifications are wrapped in SendQueuedNotifications by Laravel
    Queue::assertPushed(\Illuminate\Notifications\SendQueuedNotifications::class, function ($job) {
        return $job->notification instanceof MeetingInvitedNotification;
    });
});

it('does not notify the organizer themselves', function () {
    Queue::fake();

    [$company, $organizer, $project] = meetingUser();

    $this->actingAs($organizer)->postJson('/api/meetings', [
        'project_code' => $project->code,
        'title'        => 'Solo meeting',
        'scheduled_at' => now()->addDay()->format('Y-m-d H:i:s'),
        'invitee_ids'  => [$organizer->id],
    ])->assertCreated();

    Queue::assertNothingPushed();
});

it('notifies via whatsapp channel when invitee has phone', function () {
    Notification::fake();

    [$company, $organizer, $project] = meetingUser();
    $invitee = User::factory()->create([
        'company_id' => $company->id,
        'role_id'    => $organizer->role_id,
        'phone'      => '+22507000001',
    ]);

    $this->actingAs($organizer)->postJson('/api/meetings', [
        'project_code' => $project->code,
        'title'        => 'Réunion WhatsApp',
        'scheduled_at' => now()->addDay()->format('Y-m-d H:i:s'),
        'invitee_ids'  => [$invitee->id],
    ])->assertCreated();

    Notification::assertSentTo($invitee, MeetingInvitedNotification::class, function ($n) use ($invitee) {
        return in_array('whatsapp_custom', $n->via($invitee));
    });
});

it('does not include whatsapp channel when invitee has no phone', function () {
    Notification::fake();

    [$company, $organizer, $project] = meetingUser();
    $invitee = User::factory()->create([
        'company_id' => $company->id,
        'role_id'    => $organizer->role_id,
        'phone'      => null,
    ]);

    $this->actingAs($organizer)->postJson('/api/meetings', [
        'project_code' => $project->code,
        'title'        => 'Réunion sans WhatsApp',
        'scheduled_at' => now()->addDay()->format('Y-m-d H:i:s'),
        'invitee_ids'  => [$invitee->id],
    ])->assertCreated();

    Notification::assertSentTo($invitee, MeetingInvitedNotification::class, function ($n) use ($invitee) {
        return ! in_array('whatsapp_custom', $n->via($invitee));
    });
});

it('creates task and meeting atomically — both exist on success', function () {
    Queue::fake();

    [$company, $organizer, $project] = meetingUser();
    $invitee = User::factory()->create(['company_id' => $company->id, 'role_id' => $organizer->role_id]);

    $this->actingAs($organizer)->postJson('/api/meetings', [
        'project_code' => $project->code,
        'title'        => 'Réunion atomique',
        'scheduled_at' => now()->addDay()->format('Y-m-d H:i:s'),
        'invitee_ids'  => [$invitee->id],
        'alert_key'    => 'overdue_CH-TEST-2026-001',
        'alert_type'   => 'overdue',
    ])->assertCreated();

    $this->assertDatabaseHas('meeting_invitations', ['title' => 'Réunion atomique']);
    $this->assertDatabaseHas('tasks', ['title' => 'Réunion atomique', 'source' => 'ai']);
});

it('stores alert_key on task and links meeting via task_id', function () {
    Queue::fake();

    [$company, $organizer, $project] = meetingUser();
    $invitee = User::factory()->create(['company_id' => $company->id, 'role_id' => $organizer->role_id]);

    $this->actingAs($organizer)->postJson('/api/meetings', [
        'project_code' => $project->code,
        'title'        => 'Réunion liée',
        'scheduled_at' => now()->addDay()->format('Y-m-d H:i:s'),
        'invitee_ids'  => [$invitee->id],
        'alert_key'    => 'health_critical_42',
    ])->assertCreated();

    $task    = Task::where('alert_key', 'health_critical_42')->firstOrFail();
    $meeting = MeetingInvitation::where('task_id', $task->id)->firstOrFail();

    expect($meeting->task_id)->toBe($task->id);
});
