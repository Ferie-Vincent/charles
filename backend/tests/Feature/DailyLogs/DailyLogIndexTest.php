<?php

use App\Models\Company;
use App\Models\DailyLog;
use App\Models\Project;
use App\Models\Role;
use App\Models\User;

beforeEach(function () {
    $this->company = Company::factory()->create();
    $role = Role::query()->first();
    $this->user = User::factory()->create([
        'company_id' => $this->company->id,
        'role_id' => $role->id,
    ]);
    $this->project = Project::factory()->create([
        'company_id' => $this->company->id,
    ]);
});

it('requires authentication', function () {
    $this->getJson("/api/projects/{$this->project->id}/daily-logs")
        ->assertUnauthorized();
});

it('returns daily logs for a project ordered by date desc', function () {
    DailyLog::factory()->create([
        'project_id' => $this->project->id,
        'user_id' => $this->user->id,
        'log_date' => '2026-04-28',
        'weather' => 'Soleil',
        'workers_count' => 10,
        'progress_percent' => 40,
    ]);
    DailyLog::factory()->create([
        'project_id' => $this->project->id,
        'user_id' => $this->user->id,
        'log_date' => '2026-04-29',
        'weather' => 'Pluie',
        'workers_count' => 5,
        'progress_percent' => 45,
    ]);

    $response = $this->actingAs($this->user)
        ->getJson("/api/projects/{$this->project->id}/daily-logs");

    $response->assertOk()
        ->assertJsonCount(2, 'data')
        ->assertJsonPath('data.0.log_date', '2026-04-29')
        ->assertJsonPath('data.1.log_date', '2026-04-28');
});

it('cannot access logs for a project from another company', function () {
    $other = Company::factory()->create();
    $otherProject = Project::factory()->create(['company_id' => $other->id]);

    $this->actingAs($this->user)
        ->getJson("/api/projects/{$otherProject->id}/daily-logs")
        ->assertForbidden();
});

it('returns summary stats with logs', function () {
    DailyLog::factory()->create([
        'project_id' => $this->project->id,
        'user_id' => $this->user->id,
        'log_date' => '2026-04-28',
        'weather' => 'Soleil',
        'workers_count' => 10,
        'progress_percent' => 40,
        'has_incident' => false,
    ]);
    DailyLog::factory()->create([
        'project_id' => $this->project->id,
        'user_id' => $this->user->id,
        'log_date' => '2026-04-29',
        'weather' => 'Pluie',
        'workers_count' => 8,
        'progress_percent' => 45,
        'has_incident' => true,
        'incident_type' => 'Retard',
    ]);

    $response = $this->actingAs($this->user)
        ->getJson("/api/projects/{$this->project->id}/daily-logs");

    $response->assertOk()
        ->assertJsonPath('meta.total_logs', 2)
        ->assertJsonPath('meta.latest_progress', 45)
        ->assertJsonPath('meta.incident_count', 1)
        ->assertJsonPath('meta.avg_workers', 9);
});
