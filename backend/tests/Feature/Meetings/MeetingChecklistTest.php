<?php

use App\Models\Company;
use App\Models\Project;
use App\Models\Role;
use App\Models\Task;
use App\Models\User;
use Illuminate\Support\Facades\Queue;

function checklistUser(): array
{
    $company = Company::factory()->create();
    $role    = Role::firstOrCreate(['name' => 'direction'], ['label' => 'Direction']);
    $user    = User::factory()->create(['company_id' => $company->id, 'role_id' => $role->id]);
    $project = Project::factory()->create(['company_id' => $company->id, 'status' => 'active']);
    return [$company, $user, $project];
}

it('sets task detail to checklist when alert_type is provided', function () {
    Queue::fake();
    [$company, $user, $project] = checklistUser();
    $invitee = User::factory()->create(['company_id' => $company->id, 'role_id' => $user->role_id]);

    $this->actingAs($user)->postJson('/api/meetings', [
        'project_code' => $project->code,
        'title'        => 'Réunion avec checklist',
        'scheduled_at' => now()->addDay()->format('Y-m-d H:i:s'),
        'invitee_ids'  => [$invitee->id],
        'alert_type'   => 'overdue',
    ])->assertCreated();

    $task = Task::where('title', 'Réunion avec checklist')->firstOrFail();

    expect($task->detail)
        ->toContain('Définir les actions correctives')
        ->toContain('Assigner les tâches')
        ->toContain('Planifier un point de vérification');
});

it('task detail falls back to notes when no alert_type is provided', function () {
    Queue::fake();
    [$company, $user, $project] = checklistUser();
    $invitee = User::factory()->create(['company_id' => $company->id, 'role_id' => $user->role_id]);

    $this->actingAs($user)->postJson('/api/meetings', [
        'project_code' => $project->code,
        'title'        => 'Réunion sans checklist',
        'scheduled_at' => now()->addDay()->format('Y-m-d H:i:s'),
        'invitee_ids'  => [$invitee->id],
        'notes'        => 'Ordre du jour à définir',
    ])->assertCreated();

    $task = Task::where('title', 'Réunion sans checklist')->firstOrFail();

    expect($task->detail)->toBe('Ordre du jour à définir');
});

it('task detail is null when neither alert_type nor notes are provided', function () {
    Queue::fake();
    [$company, $user, $project] = checklistUser();
    $invitee = User::factory()->create(['company_id' => $company->id, 'role_id' => $user->role_id]);

    $this->actingAs($user)->postJson('/api/meetings', [
        'project_code' => $project->code,
        'title'        => 'Réunion minimale',
        'scheduled_at' => now()->addDay()->format('Y-m-d H:i:s'),
        'invitee_ids'  => [$invitee->id],
    ])->assertCreated();

    $task = Task::where('title', 'Réunion minimale')->firstOrFail();

    expect($task->detail)->toBeNull();
});

it('checklist takes priority over notes when both alert_type and notes are given', function () {
    Queue::fake();
    [$company, $user, $project] = checklistUser();
    $invitee = User::factory()->create(['company_id' => $company->id, 'role_id' => $user->role_id]);

    $this->actingAs($user)->postJson('/api/meetings', [
        'project_code' => $project->code,
        'title'        => 'Réunion mixte',
        'scheduled_at' => now()->addDay()->format('Y-m-d H:i:s'),
        'invitee_ids'  => [$invitee->id],
        'alert_type'   => 'budget_overrun',
        'notes'        => 'Notes supplémentaires',
    ])->assertCreated();

    $task = Task::where('title', 'Réunion mixte')->firstOrFail();

    // Checklist wins — notes not used as detail
    expect($task->detail)
        ->toContain('Définir les actions correctives')
        ->not->toBe('Notes supplémentaires');
});
