<?php

use App\Models\Company;
use App\Models\DailyAttendance;
use App\Models\Project;
use App\Models\ProjectWorker;
use App\Models\Role;
use App\Models\User;

// ── Helpers locaux ────────────────────────────────────────────────────────────

function workerUser(string $roleName, Company $company): User
{
    $role = Role::where('name', $roleName)->firstOrFail();
    return User::factory()->create(['company_id' => $company->id, 'role_id' => $role->id]);
}

function workerProject(Company $company): Project
{
    return Project::factory()->create(['company_id' => $company->id]);
}

function attachMember(Project $project, User $user): void
{
    $project->members()->create(['user_id' => $user->id, 'role' => $user->role->name]);
}

// ── P0 : Isolation cross-company (IDOR) ──────────────────────────────────────

describe('Cross-company isolation', function () {

    it('refuses GET workers from another company project', function () {
        $companyA = Company::factory()->create();
        $companyB = Company::factory()->create();

        $user    = workerUser('chef-chantier', $companyB);
        $project = workerProject($companyA);

        $this->actingAs($user)
            ->getJson("/api/projects/{$project->id}/workers")
            ->assertForbidden();
    });

    it('refuses POST worker on another company project', function () {
        $companyA = Company::factory()->create();
        $companyB = Company::factory()->create();

        $user    = workerUser('chef-chantier', $companyB);
        $project = workerProject($companyA);

        $this->actingAs($user)
            ->postJson("/api/projects/{$project->id}/workers", [
                'name'  => 'Ouvrier Test',
                'trade' => 'Maçon',
            ])
            ->assertForbidden();
    });

    it('refuses PATCH worker on another company project', function () {
        $companyA = Company::factory()->create();
        $companyB = Company::factory()->create();

        $user   = workerUser('chef-chantier', $companyB);
        $project = workerProject($companyA);
        $worker  = ProjectWorker::factory()->create([
            'project_id' => $project->id,
            'company_id' => $companyA->id,
        ]);

        $this->actingAs($user)
            ->patchJson("/api/projects/{$project->id}/workers/{$worker->id}", ['name' => 'Hack'])
            ->assertForbidden();
    });

    it('refuses DELETE worker on another company project', function () {
        $companyA = Company::factory()->create();
        $companyB = Company::factory()->create();

        $user    = workerUser('chef-chantier', $companyB);
        $project = workerProject($companyA);
        $worker  = ProjectWorker::factory()->create([
            'project_id' => $project->id,
            'company_id' => $companyA->id,
        ]);

        $this->actingAs($user)
            ->deleteJson("/api/projects/{$project->id}/workers/{$worker->id}")
            ->assertForbidden();
    });

    it('refuses POST attendance on another company project', function () {
        $companyA = Company::factory()->create();
        $companyB = Company::factory()->create();

        $user    = workerUser('chef-chantier', $companyB);
        $project = workerProject($companyA);
        $worker  = ProjectWorker::factory()->create([
            'project_id' => $project->id,
            'company_id' => $companyA->id,
        ]);

        $this->actingAs($user)
            ->postJson("/api/projects/{$project->id}/workers/attendance", [
                'worker_id' => $worker->id,
                'log_date'  => today()->toDateString(),
                'present'   => true,
            ])
            ->assertForbidden();
    });
});

// ── P0 : Policy chef-chantier doit être membre ────────────────────────────────

describe('ProjectWorkerPolicy — membership', function () {

    it('forbids chef-chantier not member of project from GET workers', function () {
        $company = Company::factory()->create();
        $chef    = workerUser('chef-chantier', $company);
        $project = workerProject($company);
        // chef N'EST PAS membre du projet

        $this->actingAs($chef)
            ->getJson("/api/projects/{$project->id}/workers")
            ->assertForbidden();
    });

    it('allows chef-chantier member to GET workers', function () {
        $company = Company::factory()->create();
        $chef    = workerUser('chef-chantier', $company);
        $project = workerProject($company);
        attachMember($project, $chef);

        $this->actingAs($chef)
            ->getJson("/api/projects/{$project->id}/workers")
            ->assertOk()
            ->assertJsonStructure(['workers']);
    });

    it('allows chef-chantier member to create a worker', function () {
        $company = Company::factory()->create();
        $chef    = workerUser('chef-chantier', $company);
        $project = workerProject($company);
        attachMember($project, $chef);

        $this->actingAs($chef)
            ->postJson("/api/projects/{$project->id}/workers", [
                'name'  => 'Kouassi Koffi',
                'trade' => 'Ferrailleur',
            ])
            ->assertCreated()
            ->assertJsonPath('worker.name', 'Kouassi Koffi');
    });

    it('forbids conducteur-travaux not member from GET workers', function () {
        $company = Company::factory()->create();
        $ct      = workerUser('conducteur-travaux', $company);
        $project = workerProject($company);

        $this->actingAs($ct)
            ->getJson("/api/projects/{$project->id}/workers")
            ->assertForbidden();
    });

    it('allows conducteur-travaux member to GET workers', function () {
        $company = Company::factory()->create();
        $ct      = workerUser('conducteur-travaux', $company);
        $project = workerProject($company);
        attachMember($project, $ct);

        $this->actingAs($ct)
            ->getJson("/api/projects/{$project->id}/workers")
            ->assertOk();
    });

    it('allows direction to GET workers without being member', function () {
        $company   = Company::factory()->create();
        $direction = workerUser('direction', $company);
        $project   = workerProject($company);
        // direction N'EST PAS membre — doit quand même avoir accès

        $this->actingAs($direction)
            ->getJson("/api/projects/{$project->id}/workers")
            ->assertOk();
    });

    it('allows directeur-technique to GET workers without being member', function () {
        $company = Company::factory()->create();
        $dt      = workerUser('directeur-technique', $company);
        $project = workerProject($company);

        $this->actingAs($dt)
            ->getJson("/api/projects/{$project->id}/workers")
            ->assertOk();
    });
});

// ── P1 : Idempotence upsert attendance ────────────────────────────────────────

describe('Attendance upsert idempotency', function () {

    it('creates exactly one attendance record on double POST', function () {
        $company = Company::factory()->create();
        $chef    = workerUser('chef-chantier', $company);
        $project = workerProject($company);
        attachMember($project, $chef);

        $worker  = ProjectWorker::factory()->create([
            'project_id' => $project->id,
            'company_id' => $company->id,
        ]);

        $payload = [
            'worker_id' => $worker->id,
            'log_date'  => today()->toDateString(),
            'present'   => true,
        ];

        $this->actingAs($chef)->postJson("/api/projects/{$project->id}/workers/attendance", $payload)->assertOk();
        $this->actingAs($chef)->postJson("/api/projects/{$project->id}/workers/attendance", $payload)->assertOk();

        expect(DailyAttendance::where('worker_id', $worker->id)->count())->toBe(1);
    });

    it('updates existing attendance on second POST', function () {
        $company = Company::factory()->create();
        $chef    = workerUser('chef-chantier', $company);
        $project = workerProject($company);
        attachMember($project, $chef);

        $worker = ProjectWorker::factory()->create([
            'project_id' => $project->id,
            'company_id' => $company->id,
        ]);

        $date = today()->toDateString();

        $this->actingAs($chef)->postJson("/api/projects/{$project->id}/workers/attendance", [
            'worker_id' => $worker->id,
            'log_date'  => $date,
            'present'   => true,
        ]);

        $this->actingAs($chef)->postJson("/api/projects/{$project->id}/workers/attendance", [
            'worker_id' => $worker->id,
            'log_date'  => $date,
            'present'   => false,
        ]);

        $att = DailyAttendance::where('worker_id', $worker->id)->where('log_date', $date)->first();
        expect($att->present)->toBeFalse();
    });
});

// ── P1 : Date filtering ──────────────────────────────────────────────────────

describe('Attendance date filtering', function () {

    it('returns attendance only for requested date', function () {
        $company = Company::factory()->create();
        $chef    = workerUser('chef-chantier', $company);
        $project = workerProject($company);
        attachMember($project, $chef);

        $worker = ProjectWorker::factory()->create([
            'project_id' => $project->id,
            'company_id' => $company->id,
        ]);

        DailyAttendance::create([
            'project_id'    => $project->id,
            'worker_id'     => $worker->id,
            'company_id'    => $company->id,
            'log_date'      => '2026-05-14',
            'present'       => true,
            'task_assigned' => null,
        ]);

        DailyAttendance::create([
            'project_id'    => $project->id,
            'worker_id'     => $worker->id,
            'company_id'    => $company->id,
            'log_date'      => '2026-05-15',
            'present'       => false,
            'task_assigned' => null,
        ]);

        $res = $this->actingAs($chef)
            ->getJson("/api/projects/{$project->id}/workers?date=2026-05-14")
            ->assertOk()
            ->json('workers');

        $found = collect($res)->firstWhere('id', $worker->id);
        expect($found['attendance']['present'])->toBeTrue();
    });

    it('defaults to today when no date param provided', function () {
        $company = Company::factory()->create();
        $chef    = workerUser('chef-chantier', $company);
        $project = workerProject($company);
        attachMember($project, $chef);

        ProjectWorker::factory()->create([
            'project_id' => $project->id,
            'company_id' => $company->id,
        ]);

        $this->actingAs($chef)
            ->getJson("/api/projects/{$project->id}/workers")
            ->assertOk()
            ->assertJsonStructure(['workers']);
    });

    it('returns null attendance for valid date with no records', function () {
        $company = Company::factory()->create();
        $chef    = workerUser('chef-chantier', $company);
        $project = workerProject($company);
        attachMember($project, $chef);

        $worker = ProjectWorker::factory()->create([
            'project_id' => $project->id,
            'company_id' => $company->id,
        ]);

        $res = $this->actingAs($chef)
            ->getJson("/api/projects/{$project->id}/workers?date=2026-01-01")
            ->assertOk()
            ->json('workers');

        $found = collect($res)->firstWhere('id', $worker->id);
        expect($found['attendance'])->toBeNull();
    });
});

// ── P2 : Intégrité DELETE ─────────────────────────────────────────────────────

describe('Worker deletion integrity', function () {

    it('deletes worker and cascades attendance records', function () {
        $company = Company::factory()->create();
        $chef    = workerUser('chef-chantier', $company);
        $project = workerProject($company);
        attachMember($project, $chef);

        $worker = ProjectWorker::factory()->create([
            'project_id' => $project->id,
            'company_id' => $company->id,
        ]);

        DailyAttendance::create([
            'project_id' => $project->id,
            'worker_id'  => $worker->id,
            'company_id' => $company->id,
            'log_date'   => today()->toDateString(),
            'present'    => true,
        ]);

        $this->actingAs($chef)
            ->deleteJson("/api/projects/{$project->id}/workers/{$worker->id}")
            ->assertNoContent();

        expect(ProjectWorker::find($worker->id))->toBeNull();
        // Cascade défini en migration → attendance supprimée aussi
        expect(DailyAttendance::where('worker_id', $worker->id)->count())->toBe(0);
    });
});
