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
