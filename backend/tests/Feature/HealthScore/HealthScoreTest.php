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
        'role_id'    => $role->id,
    ]);
    $this->project = Project::factory()->create([
        'company_id'      => $this->company->id,
        'start_date'      => now()->subDays(10),
        'target_progress' => 50,
    ]);
});

it('requires authentication', function () {
    $this->getJson("/api/projects/{$this->project->id}/health-score")
        ->assertUnauthorized();
});

it('denies access to project from another company', function () {
    $other = Company::factory()->create();
    $project = Project::factory()->create(['company_id' => $other->id]);

    $this->actingAs($this->user)
        ->getJson("/api/projects/{$project->id}/health-score")
        ->assertForbidden();
});

it('returns 100 score shape', function () {
    $this->actingAs($this->user)
        ->getJson("/api/projects/{$this->project->id}/health-score")
        ->assertOk()
        ->assertJsonStructure([
            'score', 'label',
            'planning_score', 'regularity_score', 'budget_score', 'safety_score',
            'latest_progress', 'target_progress', 'total_logs', 'incident_count',
        ]);
});

it('returns critical label when score below 50', function () {
    // planning=0 (no logs, target=100), regularity=0, budget=25, safety=0 (5 incidents) → total=25
    $this->project->update(['target_progress' => 100]);

    foreach (range(0, 4) as $i) {
        DailyLog::factory()->create([
            'project_id'   => $this->project->id,
            'user_id'      => $this->user->id,
            'log_date'     => now()->subDays($i + 1)->toDateString(),
            'has_incident' => true,
        ]);
    }

    $this->actingAs($this->user)
        ->getJson("/api/projects/{$this->project->id}/health-score")
        ->assertOk()
        ->assertJsonPath('label', 'critical');
});

it('returns good label when project is on track with regular logs', function () {
    $this->project->update(['target_progress' => 0]);

    foreach (range(0, 9) as $i) {
        DailyLog::factory()->create([
            'project_id'       => $this->project->id,
            'user_id'          => $this->user->id,
            'log_date'         => now()->subDays(10 - $i)->toDateString(),
            'progress_percent' => 0,
            'has_incident'     => false,
        ]);
    }

    $response = $this->actingAs($this->user)
        ->getJson("/api/projects/{$this->project->id}/health-score")
        ->assertOk();

    expect($response->json('score'))->toBeGreaterThanOrEqual(75);
    expect($response->json('label'))->toBe('good');
});

it('penalises incidents in safety score', function () {
    foreach (range(0, 2) as $i) {
        DailyLog::factory()->create([
            'project_id'   => $this->project->id,
            'user_id'      => $this->user->id,
            'has_incident' => true,
            'log_date'     => now()->subDays($i + 1)->toDateString(),
        ]);
    }

    $response = $this->actingAs($this->user)
        ->getJson("/api/projects/{$this->project->id}/health-score")
        ->assertOk();

    expect($response->json('safety_score'))->toBe(10);
    expect($response->json('incident_count'))->toBe(3);
});

it('returns budget_score of 25 as placeholder', function () {
    $this->actingAs($this->user)
        ->getJson("/api/projects/{$this->project->id}/health-score")
        ->assertOk()
        ->assertJsonPath('budget_score', 25);
});
