<?php

use App\Models\Company;
use App\Models\MeetingInvitation;
use App\Models\Project;
use App\Models\Role;
use App\Models\Task;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Queue;

function metricsSetup(): array
{
    $company = Company::factory()->create();
    $role    = Role::firstOrCreate(['name' => 'direction'], ['label' => 'Direction']);
    $user    = User::factory()->create(['company_id' => $company->id, 'role_id' => $role->id]);
    $project = Project::factory()->create(['company_id' => $company->id, 'status' => 'active']);
    return [$company, $user, $project, $role];
}

function makeTask(int $companyId, int $userId, string $status = 'todo'): Task
{
    return Task::create([
        'company_id'  => $companyId,
        'assigned_by' => $userId,
        'title'       => 'Test task',
        'priority'    => 'normal',
        'status'      => $status,
        'source'      => 'ai',
        'alert_key'   => 'key_' . uniqid(),
    ]);
}

function makeMeeting(int $companyId, int $projectId, int $organizerId, int $taskId): MeetingInvitation
{
    return MeetingInvitation::create([
        'company_id'   => $companyId,
        'project_id'   => $projectId,
        'task_id'      => $taskId,
        'organized_by' => $organizerId,
        'title'        => 'Test meeting',
        'scheduled_at' => now()->addDay(),
    ]);
}

function attachInvitee(MeetingInvitation $meeting, int $userId, string $status): void
{
    DB::table('meeting_invitation_users')->insert([
        'meeting_invitation_id' => $meeting->id,
        'user_id'               => $userId,
        'status'                => $status,
        'rsvp_token'            => \Illuminate\Support\Str::uuid()->toString(),
        'created_at'            => now(),
        'updated_at'            => now(),
    ]);
}

// ── Endpoint access ───────────────────────────────────────────────────────────

it('requires authentication to access metrics', function () {
    $this->getJson('/api/meetings/metrics')->assertUnauthorized();
});

it('returns metrics structure with correct keys', function () {
    [$company, $user] = metricsSetup();

    $this->actingAs($user)
        ->getJson('/api/meetings/metrics')
        ->assertOk()
        ->assertJsonStructure([
            'rsvp'       => ['total', 'answered', 'pending', 'accepted', 'declined', 'response_rate_pct', 'accept_rate_pct'],
            'channels'   => ['total', 'whatsapp', 'mail_only', 'whatsapp_rate_pct'],
            'checklists' => ['total', 'done', 'completion_rate_pct', 'below_threshold'],
        ]);
});

// ── RSVP metrics ─────────────────────────────────────────────────────────────

it('computes rsvp rates correctly from mixed statuses', function () {
    Queue::fake();
    [$company, $user, $project, $role] = metricsSetup();

    $task    = makeTask($company->id, $user->id);
    $meeting = makeMeeting($company->id, $project->id, $user->id, $task->id);

    $a = User::factory()->create(['company_id' => $company->id, 'role_id' => $role->id]);
    $b = User::factory()->create(['company_id' => $company->id, 'role_id' => $role->id]);
    $c = User::factory()->create(['company_id' => $company->id, 'role_id' => $role->id]);
    $d = User::factory()->create(['company_id' => $company->id, 'role_id' => $role->id]);

    attachInvitee($meeting, $a->id, 'accepted');
    attachInvitee($meeting, $b->id, 'accepted');
    attachInvitee($meeting, $c->id, 'declined');
    attachInvitee($meeting, $d->id, 'invited');  // pending

    $json = $this->actingAs($user)->getJson('/api/meetings/metrics')->assertOk()->json();

    // 4 total, 3 answered (2 accepted + 1 declined), 1 pending
    expect($json['rsvp']['total'])->toBe(4)
        ->and($json['rsvp']['accepted'])->toBe(2)
        ->and($json['rsvp']['declined'])->toBe(1)
        ->and($json['rsvp']['pending'])->toBe(1)
        ->and($json['rsvp']['answered'])->toBe(3)
        ->and($json['rsvp']['response_rate_pct'])->toBe(75)    // round(3/4*100,1)=75.0 → JSON int
        ->and($json['rsvp']['accept_rate_pct'])->toBe(66.7);   // round(2/3*100,1)=66.7 → JSON float
});

it('returns zero rates when no invitations exist', function () {
    [$company, $user] = metricsSetup();

    $json = $this->actingAs($user)->getJson('/api/meetings/metrics')->assertOk()->json();

    expect($json['rsvp']['response_rate_pct'])->toBe(0)
        ->and($json['rsvp']['accept_rate_pct'])->toBe(0)
        ->and($json['rsvp']['total'])->toBe(0);
});

it('scopes rsvp metrics to authenticated user company only', function () {
    Queue::fake();
    [$company, $user, $project, $role] = metricsSetup();

    // Other company — should NOT appear in metrics
    $other        = Company::factory()->create();
    $otherRole    = Role::firstOrCreate(['name' => 'direction'], ['label' => 'Direction']);
    $otherUser    = User::factory()->create(['company_id' => $other->id, 'role_id' => $otherRole->id]);
    $otherProject = Project::factory()->create(['company_id' => $other->id, 'status' => 'active']);
    $otherTask    = makeTask($other->id, $otherUser->id);
    $otherMeeting = makeMeeting($other->id, $otherProject->id, $otherUser->id, $otherTask->id);
    attachInvitee($otherMeeting, $otherUser->id, 'accepted');

    $json = $this->actingAs($user)->getJson('/api/meetings/metrics')->assertOk()->json();

    expect($json['rsvp']['total'])->toBe(0);
});

// ── Channel metrics ───────────────────────────────────────────────────────────

it('counts whatsapp vs mail-only channels correctly', function () {
    Queue::fake();
    [$company, $user, $project, $role] = metricsSetup();

    $task    = makeTask($company->id, $user->id);
    $meeting = makeMeeting($company->id, $project->id, $user->id, $task->id);

    $withPhone    = User::factory()->create(['company_id' => $company->id, 'role_id' => $role->id, 'phone' => '+22507000001']);
    $withoutPhone = User::factory()->create(['company_id' => $company->id, 'role_id' => $role->id, 'phone' => null]);
    $withoutPhone2 = User::factory()->create(['company_id' => $company->id, 'role_id' => $role->id, 'phone' => null]);

    attachInvitee($meeting, $withPhone->id, 'accepted');
    attachInvitee($meeting, $withoutPhone->id, 'invited');
    attachInvitee($meeting, $withoutPhone2->id, 'invited');

    $json = $this->actingAs($user)->getJson('/api/meetings/metrics')->assertOk()->json();

    expect($json['channels']['total'])->toBe(3)
        ->and($json['channels']['whatsapp'])->toBe(1)
        ->and($json['channels']['mail_only'])->toBe(2)
        ->and($json['channels']['whatsapp_rate_pct'])->toBe(33.3);  // 1/3 * 100
});

// ── Checklist metrics ─────────────────────────────────────────────────────────

it('computes checklist completion rate correctly', function () {
    [$company, $user] = metricsSetup();

    // 2 done, 2 todo → 50%
    Task::create(['company_id' => $company->id, 'assigned_by' => $user->id, 'title' => 'T1', 'priority' => 'normal', 'status' => 'done',    'source' => 'ai', 'alert_key' => 'key_a']);
    Task::create(['company_id' => $company->id, 'assigned_by' => $user->id, 'title' => 'T2', 'priority' => 'normal', 'status' => 'done',    'source' => 'ai', 'alert_key' => 'key_b']);
    Task::create(['company_id' => $company->id, 'assigned_by' => $user->id, 'title' => 'T3', 'priority' => 'normal', 'status' => 'todo',    'source' => 'ai', 'alert_key' => 'key_c']);
    Task::create(['company_id' => $company->id, 'assigned_by' => $user->id, 'title' => 'T4', 'priority' => 'normal', 'status' => 'in_progress', 'source' => 'ai', 'alert_key' => 'key_d']);

    $json = $this->actingAs($user)->getJson('/api/meetings/metrics')->assertOk()->json();

    expect($json['checklists']['total'])->toBe(4)
        ->and($json['checklists']['done'])->toBe(2)
        ->and($json['checklists']['completion_rate_pct'])->toBe(50)   // round(2/4*100,1)=50.0 → JSON int
        ->and($json['checklists']['below_threshold'])->toBeFalse();
});

it('flags below_threshold true when completion rate is under 20%', function () {
    [$company, $user] = metricsSetup();

    // 1 done, 9 todo → 10% — below 20% threshold
    Task::create(['company_id' => $company->id, 'assigned_by' => $user->id, 'title' => 'Done', 'priority' => 'normal', 'status' => 'done', 'source' => 'ai', 'alert_key' => 'key_done']);
    foreach (range(1, 9) as $i) {
        Task::create(['company_id' => $company->id, 'assigned_by' => $user->id, 'title' => "Todo $i", 'priority' => 'normal', 'status' => 'todo', 'source' => 'ai', 'alert_key' => "key_todo_$i"]);
    }

    $json = $this->actingAs($user)->getJson('/api/meetings/metrics')->assertOk()->json();

    expect($json['checklists']['below_threshold'])->toBeTrue()
        ->and($json['checklists']['completion_rate_pct'])->toBe(10);   // round(1/10*100,1)=10.0 → JSON int
});

it('excludes manual tasks from checklist metrics', function () {
    [$company, $user] = metricsSetup();

    // Manual task with alert_key — should NOT count (source != ai)
    Task::create(['company_id' => $company->id, 'assigned_by' => $user->id, 'title' => 'Manuel', 'priority' => 'normal', 'status' => 'done', 'source' => 'manual', 'alert_key' => 'key_manual']);
    // AI task without alert_key — should NOT count
    Task::create(['company_id' => $company->id, 'assigned_by' => $user->id, 'title' => 'AI no key', 'priority' => 'normal', 'status' => 'done', 'source' => 'ai', 'alert_key' => null]);
    // Valid: AI + alert_key
    Task::create(['company_id' => $company->id, 'assigned_by' => $user->id, 'title' => 'AI valid', 'priority' => 'normal', 'status' => 'done', 'source' => 'ai', 'alert_key' => 'key_valid']);

    $json = $this->actingAs($user)->getJson('/api/meetings/metrics')->assertOk()->json();

    expect($json['checklists']['total'])->toBe(1)
        ->and($json['checklists']['done'])->toBe(1);
});

it('returns zero checklist rate when no qualifying tasks', function () {
    [$company, $user] = metricsSetup();

    $json = $this->actingAs($user)->getJson('/api/meetings/metrics')->assertOk()->json();

    // 0% < 20% threshold → below_threshold is true even with no tasks
    expect($json['checklists']['completion_rate_pct'])->toBe(0)
        ->and($json['checklists']['below_threshold'])->toBeTrue();
});
