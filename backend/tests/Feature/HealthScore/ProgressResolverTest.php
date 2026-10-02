<?php

use App\Models\Company;
use App\Models\DailyLog;
use App\Models\Project;
use App\Models\Role;
use App\Models\SituationTravaux;
use App\Models\User;
use App\Services\ProjectProgressResolver;

beforeEach(function () {
    $this->company = Company::factory()->create();
    $this->user    = User::factory()->create([
        'company_id' => $this->company->id,
        'role_id'    => Role::where('name', 'direction')->value('id'),
    ]);
    $this->project = Project::factory()->create([
        'company_id' => $this->company->id,
        'status'     => 'active',
        'start_date' => now()->subDays(90),
        'end_date'   => now()->addDays(90),
        'target_progress' => 50,
    ]);
});

function prSituation(Project $project, float $pct, string $status, $validatedAt): SituationTravaux
{
    return SituationTravaux::create([
        'project_id' => $project->id, 'company_id' => $project->company_id,
        'numero' => 'ST-' . uniqid(), 'periode' => '2026-09', 'avancement_pct' => $pct,
        'montant_brut_ht' => 1, 'net_a_payer' => 1, 'status' => $status, 'validated_at' => $validatedAt,
    ]);
}

function prLog(Project $project, User $user, int $pct, $date): DailyLog
{
    return DailyLog::factory()->create([
        'project_id' => $project->id, 'user_id' => $user->id,
        'log_date' => $date, 'progress_percent' => $pct,
    ]);
}

it('returns none when there is neither log nor certified situation', function () {
    $r = (new ProjectProgressResolver())->resolve($this->project);
    expect($r['source'])->toBe('none')->and($r['value'])->toBe(0.0);
});

it('uses the declared journal progress when no situation is certified', function () {
    prLog($this->project, $this->user, 42, now()->subDay());

    $r = (new ProjectProgressResolver())->resolve($this->project);
    expect($r['source'])->toBe('declared')->and($r['value'])->toBe(42.0)->and($r['certified'])->toBeNull();
});

it('prefers a recent certified situation over an optimistic journal', function () {
    prLog($this->project, $this->user, 70, now()->subDay());
    prSituation($this->project, 35, 'validee_moe', now()->subDays(10));
    prSituation($this->project, 20, 'payee', now()->subDays(40));   // plus ancienne
    prSituation($this->project, 90, 'brouillon', null);             // non certifiée → ignorée

    $r = (new ProjectProgressResolver())->resolve($this->project);
    expect($r['source'])->toBe('certified')
        ->and($r['value'])->toBe(35.0)
        ->and($r['declared'])->toBe(70.0)
        ->and($r['gap'])->toBe(35.0);
});

it('falls back to the journal when the certified situation is older than 60 days', function () {
    prLog($this->project, $this->user, 55, now()->subDay());
    prSituation($this->project, 30, 'validee_moe', now()->subDays(75));

    $r = (new ProjectProgressResolver())->resolve($this->project);
    expect($r['source'])->toBe('declared')->and($r['value'])->toBe(55.0)->and($r['certified'])->toBe(30.0);
});

it('feeds the health score with the certified progress and exposes the source', function () {
    prLog($this->project, $this->user, 80, now()->subDay());
    prSituation($this->project, 30, 'validee_moe', now()->subDays(5));

    $this->actingAs($this->user)->getJson("/api/projects/{$this->project->id}/health-score")
        ->assertOk()
        ->assertJsonPath('latest_progress', 30)
        ->assertJsonPath('progress_source', 'certified')
        ->assertJsonPath('declared_progress', 80)
        ->assertJsonPath('certified_progress', 30)
        ->assertJsonPath('progress_gap', 50);
});
