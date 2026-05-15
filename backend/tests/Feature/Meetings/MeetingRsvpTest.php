<?php

use App\Models\Company;
use App\Models\MeetingInvitation;
use App\Models\Project;
use App\Models\Role;
use App\Models\User;
use Illuminate\Support\Str;

function rsvpFixture(): array
{
    $company  = Company::factory()->create();
    $role     = Role::firstOrCreate(['name' => 'direction'], ['label' => 'Direction']);
    $organizer = User::factory()->create(['company_id' => $company->id, 'role_id' => $role->id]);
    $invitee   = User::factory()->create(['company_id' => $company->id, 'role_id' => $role->id]);
    $project   = Project::factory()->create(['company_id' => $company->id]);

    $meeting = MeetingInvitation::create([
        'company_id'   => $company->id,
        'project_id'   => $project->id,
        'organized_by' => $organizer->id,
        'title'        => 'Test meeting',
        'scheduled_at' => now()->addHours(2),
    ]);

    $token = Str::uuid()->toString();
    \Illuminate\Support\Facades\DB::table('meeting_invitation_users')->insert([
        'meeting_invitation_id' => $meeting->id,
        'user_id'               => $invitee->id,
        'status'                => 'invited',
        'rsvp_token'            => $token,
        'created_at'            => now(),
        'updated_at'            => now(),
    ]);

    return [$meeting, $invitee, $organizer, $token];
}

// ── Token RSVP (sans auth) ────────────────────────────────────────────────────

it('accepts valid RSVP token and updates status to accepted', function () {
    [$meeting, $invitee, $organizer, $token] = rsvpFixture();

    $response = $this->get("/api/meetings/rsvp/{$token}/accepted");

    $response->assertOk()->assertSee('Présence confirmée');
    $this->assertDatabaseHas('meeting_invitation_users', [
        'rsvp_token' => $token,
        'status'     => 'accepted',
    ]);
});

it('accepts valid RSVP token and updates status to declined', function () {
    [$meeting, $invitee, $organizer, $token] = rsvpFixture();

    $this->get("/api/meetings/rsvp/{$token}/declined")->assertOk()->assertSee('Absence notifiée');

    $this->assertDatabaseHas('meeting_invitation_users', [
        'rsvp_token' => $token,
        'status'     => 'declined',
    ]);
});

it('returns 400 for invalid status value', function () {
    [$meeting, $invitee, $organizer, $token] = rsvpFixture();

    $this->get("/api/meetings/rsvp/{$token}/hacked")->assertStatus(400);
});

it('returns 404 for unknown token', function () {
    $this->get('/api/meetings/rsvp/00000000-0000-0000-0000-000000000000/accepted')->assertStatus(404);
});

it('returns 410 when meeting is already past', function () {
    $company   = Company::factory()->create();
    $role      = Role::firstOrCreate(['name' => 'direction'], ['label' => 'Direction']);
    $organizer = User::factory()->create(['company_id' => $company->id, 'role_id' => $role->id]);
    $invitee   = User::factory()->create(['company_id' => $company->id, 'role_id' => $role->id]);
    $project   = Project::factory()->create(['company_id' => $company->id]);

    $meeting = MeetingInvitation::create([
        'company_id'   => $company->id,
        'project_id'   => $project->id,
        'organized_by' => $organizer->id,
        'title'        => 'Réunion passée',
        'scheduled_at' => now()->subHour(),
    ]);

    $token = Str::uuid()->toString();
    \Illuminate\Support\Facades\DB::table('meeting_invitation_users')->insert([
        'meeting_invitation_id' => $meeting->id,
        'user_id'               => $invitee->id,
        'status'                => 'invited',
        'rsvp_token'            => $token,
        'created_at'            => now(),
        'updated_at'            => now(),
    ]);

    $this->get("/api/meetings/rsvp/{$token}/accepted")->assertStatus(410);
});

it('is idempotent — repeated RSVP with same token returns 200', function () {
    [$meeting, $invitee, $organizer, $token] = rsvpFixture();

    $this->get("/api/meetings/rsvp/{$token}/accepted")->assertOk();
    $this->get("/api/meetings/rsvp/{$token}/accepted")->assertOk();

    $this->assertDatabaseHas('meeting_invitation_users', ['rsvp_token' => $token, 'status' => 'accepted']);
});

it('token is scoped to one invitee — different token returns 404', function () {
    [$meeting, $invitee, $organizer, $token] = rsvpFixture();

    $fakeToken = Str::uuid()->toString();
    $this->get("/api/meetings/rsvp/{$fakeToken}/accepted")->assertStatus(404);
});

// ── RSVP authentifié ─────────────────────────────────────────────────────────

it('authenticated user can respond to meeting invitation', function () {
    [$meeting, $invitee, $organizer, $token] = rsvpFixture();

    $this->actingAs($invitee)
        ->patchJson("/api/meeting-invitations/{$meeting->id}/respond", ['status' => 'accepted'])
        ->assertOk()
        ->assertJsonPath('status', 'accepted');

    $this->assertDatabaseHas('meeting_invitation_users', [
        'meeting_invitation_id' => $meeting->id,
        'user_id'               => $invitee->id,
        'status'                => 'accepted',
    ]);
});

it('organizer can fetch RSVP status summary', function () {
    [$meeting, $invitee, $organizer, $token] = rsvpFixture();

    $this->actingAs($organizer)
        ->getJson("/api/meetings/{$meeting->id}/rsvp-status")
        ->assertOk()
        ->assertJsonStructure(['accepted', 'declined', 'invited', 'invitees']);
});
