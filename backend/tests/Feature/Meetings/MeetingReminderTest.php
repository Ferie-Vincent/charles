<?php

use App\Models\Company;
use App\Models\MeetingInvitation;
use App\Models\Project;
use App\Models\Role;
use App\Models\User;
use App\Services\WhatsAppAlertService;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

function reminderFixture(Carbon $scheduledAt, bool $hasPhone = true, bool $reminderSent = false): array
{
    $company   = Company::factory()->create();
    $role      = Role::firstOrCreate(['name' => 'direction'], ['label' => 'Direction']);
    $organizer = User::factory()->create(['company_id' => $company->id, 'role_id' => $role->id]);
    $invitee   = User::factory()->create([
        'company_id' => $company->id,
        'role_id'    => $role->id,
        'phone'      => $hasPhone ? '+22507000099' : null,
    ]);
    $project = Project::factory()->create(['company_id' => $company->id]);

    $meeting = MeetingInvitation::create([
        'company_id'    => $company->id,
        'project_id'    => $project->id,
        'organized_by'  => $organizer->id,
        'title'         => 'Réunion rappel',
        'scheduled_at'  => $scheduledAt,
        'reminder_sent' => $reminderSent,
    ]);

    DB::table('meeting_invitation_users')->insert([
        'meeting_invitation_id' => $meeting->id,
        'user_id'               => $invitee->id,
        'status'                => 'invited',
        'rsvp_token'            => \Illuminate\Support\Str::uuid()->toString(),
        'created_at'            => now(),
        'updated_at'            => now(),
    ]);

    return [$meeting, $invitee];
}

afterEach(fn () => Carbon::setTestNow());

it('sends reminders for meetings within the 30-minute window', function () {
    $whatsapp = Mockery::mock(WhatsAppAlertService::class);
    $whatsapp->shouldReceive('send')->once();
    $this->app->instance(WhatsAppAlertService::class, $whatsapp);

    Carbon::setTestNow('2026-05-15 09:00:00');
    reminderFixture(Carbon::parse('2026-05-15 09:30:00'));

    $this->artisan('meetings:send-reminders')->assertSuccessful();
});

it('does not send reminders for meetings outside the window', function () {
    $whatsapp = Mockery::mock(WhatsAppAlertService::class);
    $whatsapp->shouldReceive('send')->never();
    $this->app->instance(WhatsAppAlertService::class, $whatsapp);

    Carbon::setTestNow('2026-05-15 09:00:00');
    reminderFixture(Carbon::parse('2026-05-15 10:00:00')); // 60 min, hors fenêtre

    $this->artisan('meetings:send-reminders')->assertSuccessful();
});

it('does not send reminders when reminder_sent is already true (idempotence)', function () {
    $whatsapp = Mockery::mock(WhatsAppAlertService::class);
    $whatsapp->shouldReceive('send')->never();
    $this->app->instance(WhatsAppAlertService::class, $whatsapp);

    Carbon::setTestNow('2026-05-15 09:00:00');
    reminderFixture(Carbon::parse('2026-05-15 09:30:00'), hasPhone: true, reminderSent: true);

    $this->artisan('meetings:send-reminders')->assertSuccessful();
});

it('skips invitees who declined or have no phone', function () {
    $whatsapp = Mockery::mock(WhatsAppAlertService::class);
    $whatsapp->shouldReceive('send')->never();
    $this->app->instance(WhatsAppAlertService::class, $whatsapp);

    Carbon::setTestNow('2026-05-15 09:00:00');
    [$meeting, $invitee] = reminderFixture(Carbon::parse('2026-05-15 09:30:00'), hasPhone: false);

    $this->artisan('meetings:send-reminders')->assertSuccessful();
});

it('sets reminder_sent to true after sending', function () {
    $whatsapp = Mockery::mock(WhatsAppAlertService::class);
    $whatsapp->shouldReceive('send')->once();
    $this->app->instance(WhatsAppAlertService::class, $whatsapp);

    Carbon::setTestNow('2026-05-15 09:00:00');
    [$meeting] = reminderFixture(Carbon::parse('2026-05-15 09:30:00'));

    $this->artisan('meetings:send-reminders')->assertSuccessful();

    $this->assertDatabaseHas('meeting_invitations', [
        'id'            => $meeting->id,
        'reminder_sent' => true,
    ]);
});
