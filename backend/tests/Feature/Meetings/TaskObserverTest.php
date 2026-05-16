<?php

use App\Models\Company;
use App\Models\Role;
use App\Models\Task;
use App\Models\User;
use Illuminate\Support\Facades\DB;

function observerUser(): array
{
    $company = Company::factory()->create();
    $role    = Role::firstOrCreate(['name' => 'direction'], ['label' => 'Direction']);
    $user    = User::factory()->create(['company_id' => $company->id, 'role_id' => $role->id]);
    return [$company, $user];
}

it('permanently archives alert when task is marked done with alert_key', function () {
    [$company, $user] = observerUser();

    $task = Task::create([
        'company_id'  => $company->id,
        'assigned_by' => $user->id,
        'title'       => 'Réunion rattrapage',
        'priority'    => 'urgent',
        'status'      => 'in_progress',
        'source'      => 'ai',
        'alert_key'   => 'overdue_CH-TEST-2026-042',
    ]);

    $task->update(['status' => 'done']);

    $this->assertDatabaseHas('dismissed_alerts', [
        'user_id'      => $user->id,
        'alert_key'    => 'overdue_CH-TEST-2026-042',
        'reappears_at' => null,
    ]);
});

it('does not archive alert when task has no alert_key', function () {
    [$company, $user] = observerUser();

    $task = Task::create([
        'company_id'  => $company->id,
        'assigned_by' => $user->id,
        'title'       => 'Tâche manuelle',
        'priority'    => 'normal',
        'status'      => 'in_progress',
        'source'      => 'manual',
    ]);

    $task->update(['status' => 'done']);

    expect(DB::table('dismissed_alerts')->where('user_id', $user->id)->count())->toBe(0);
});

it('does not archive alert when task status changes to something other than done', function () {
    [$company, $user] = observerUser();

    $task = Task::create([
        'company_id'  => $company->id,
        'assigned_by' => $user->id,
        'title'       => 'Tâche bloquée',
        'priority'    => 'high',
        'status'      => 'in_progress',
        'source'      => 'ai',
        'alert_key'   => 'overdue_CH-TEST-2026-099',
    ]);

    $task->update(['status' => 'blocked']);

    expect(DB::table('dismissed_alerts')->where('alert_key', 'overdue_CH-TEST-2026-099')->count())->toBe(0);
});

it('permanent snooze survives even if the linked task is never completed', function () {
    // Semantic: "permanent dismiss" = user chose to never see this alert again.
    // The task may remain open forever — alert does NOT reappear.
    // If the task IS eventually done, the observer archives it again (idempotent).
    [$company, $user] = observerUser();

    // Simulate direction permanently dismissing an alert via the frontend
    DB::table('dismissed_alerts')->insert([
        'user_id'      => $user->id,
        'alert_key'    => 'overdue_CH-TEST-2026-perm',
        'dismissed_at' => now(),
        'reappears_at' => null,
    ]);

    // Task is created but NEVER marked done
    Task::create([
        'company_id'  => $company->id,
        'assigned_by' => $user->id,
        'title'       => 'Tâche abandonnée',
        'priority'    => 'urgent',
        'status'      => 'in_progress',
        'source'      => 'ai',
        'alert_key'   => 'overdue_CH-TEST-2026-perm',
    ]);

    // Alert stays permanently dismissed — no reappears_at set
    $this->assertDatabaseHas('dismissed_alerts', [
        'user_id'      => $user->id,
        'alert_key'    => 'overdue_CH-TEST-2026-perm',
        'reappears_at' => null,
    ]);
    expect(DB::table('dismissed_alerts')
        ->where('alert_key', 'overdue_CH-TEST-2026-perm')
        ->whereNotNull('reappears_at')
        ->count()
    )->toBe(0);
});

it('is idempotent — archiving same alert_key twice keeps reappears_at null', function () {
    [$company, $user] = observerUser();

    $task = Task::create([
        'company_id'  => $company->id,
        'assigned_by' => $user->id,
        'title'       => 'Tâche idempotente',
        'priority'    => 'urgent',
        'status'      => 'in_progress',
        'source'      => 'ai',
        'alert_key'   => 'overdue_CH-TEST-2026-idem',
    ]);

    $task->update(['status' => 'done']);
    $task->update(['status' => 'in_progress']);
    $task->update(['status' => 'done']);

    expect(DB::table('dismissed_alerts')
        ->where('alert_key', 'overdue_CH-TEST-2026-idem')
        ->whereNull('reappears_at')
        ->count()
    )->toBe(1);
});
