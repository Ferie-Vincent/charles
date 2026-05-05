<?php

use App\Models\Company;
use App\Models\Project;
use App\Models\Role;
use App\Models\User;
use Illuminate\Support\Facades\DB;

beforeEach(function () {
    $this->company = Company::factory()->create();
    $role = Role::query()->first();
    $this->user = User::factory()->create([
        'company_id' => $this->company->id,
        'role_id' => $role->id,
    ]);
    $this->project = Project::factory()->create([
        'company_id' => $this->company->id,
        'status'     => 'active',
    ]);
});

it('requires authentication', function () {
    $this->postJson("/api/projects/{$this->project->id}/daily-logs", [])
        ->assertUnauthorized();
});

it('creates a daily log with required fields', function () {
    $response = $this->actingAs($this->user)->postJson(
        "/api/projects/{$this->project->id}/daily-logs",
        [
            'weather' => 'Soleil',
            'workers_count' => 12,
            'progress_percent' => 45.5,
        ]
    );

    $response->assertCreated()
        ->assertJsonPath('data.project_id', $this->project->id)
        ->assertJsonPath('data.workers_count', 12)
        ->assertJsonPath('data.progress_percent', 45.5)
        ->assertJsonPath('data.weather', 'Soleil');

    $this->assertDatabaseHas('daily_logs', [
        'project_id' => $this->project->id,
        'workers_count' => 12,
        'log_date' => now()->toDateString(),
    ]);
});

it('auto-sets log_date to today regardless of input', function () {
    $response = $this->actingAs($this->user)->postJson(
        "/api/projects/{$this->project->id}/daily-logs",
        [
            'weather' => 'Pluie',
            'workers_count' => 8,
            'progress_percent' => 30,
            'log_date' => '2020-01-01',
        ]
    );

    $response->assertCreated()
        ->assertJsonPath('data.log_date', now()->toDateString());
});

it('rejects duplicate log for same project on same day', function () {
    $this->actingAs($this->user)->postJson(
        "/api/projects/{$this->project->id}/daily-logs",
        [
            'weather' => 'Soleil',
            'workers_count' => 10,
            'progress_percent' => 50,
        ]
    )->assertCreated();

    $this->actingAs($this->user)->postJson(
        "/api/projects/{$this->project->id}/daily-logs",
        [
            'weather' => 'Nuageux',
            'workers_count' => 10,
            'progress_percent' => 50,
        ]
    )->assertUnprocessable()
        ->assertJsonValidationErrors(['log_date']);
});

it('validates required fields', function () {
    $this->actingAs($this->user)->postJson(
        "/api/projects/{$this->project->id}/daily-logs",
        []
    )->assertUnprocessable()
        ->assertJsonValidationErrors(['weather', 'workers_count', 'progress_percent']);
});

it('validates weather is a known value', function () {
    $this->actingAs($this->user)->postJson(
        "/api/projects/{$this->project->id}/daily-logs",
        [
            'weather' => 'Inconnu',
            'workers_count' => 5,
            'progress_percent' => 20,
        ]
    )->assertUnprocessable()
        ->assertJsonValidationErrors(['weather']);
});

it('validates progress_percent is between 0 and 100', function () {
    $this->actingAs($this->user)->postJson(
        "/api/projects/{$this->project->id}/daily-logs",
        [
            'weather' => 'Soleil',
            'workers_count' => 5,
            'progress_percent' => 150,
        ]
    )->assertUnprocessable()
        ->assertJsonValidationErrors(['progress_percent']);
});

it('cannot log for a project belonging to another company', function () {
    $otherCompany = Company::factory()->create();
    $otherProject = Project::factory()->create(['company_id' => $otherCompany->id]);

    $this->actingAs($this->user)->postJson(
        "/api/projects/{$otherProject->id}/daily-logs",
        [
            'weather' => 'Soleil',
            'workers_count' => 5,
            'progress_percent' => 20,
        ]
    )->assertForbidden();
});

it('stores incident info when has_incident is true', function () {
    $response = $this->actingAs($this->user)->postJson(
        "/api/projects/{$this->project->id}/daily-logs",
        [
            'weather' => 'Soleil',
            'workers_count' => 10,
            'progress_percent' => 60,
            'has_incident' => true,
            'incident_type' => 'Accident',
        ]
    );

    $response->assertCreated()
        ->assertJsonPath('data.has_incident', true)
        ->assertJsonPath('data.incident_type', 'Accident');
});
