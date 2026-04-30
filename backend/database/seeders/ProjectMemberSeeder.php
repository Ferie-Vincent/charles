<?php

namespace Database\Seeders;

use App\Models\Project;
use App\Models\ProjectMember;
use App\Models\User;
use Illuminate\Database\Seeder;

class ProjectMemberSeeder extends Seeder
{
    public function run(): void
    {
        $users = User::query()->with('role')->get()->keyBy(fn ($u) => $u->role->name . ':' . $u->email);

        $dt         = User::query()->where('email', 'dt@charles.ci')->first();
        $conducteur = User::query()->where('email', 'conducteur@charles.ci')->first();
        $chefAngre  = User::query()->where('email', 'chef.angre@charles.ci')->first();
        $chefYop    = User::query()->where('email', 'chef.yop@charles.ci')->first();
        $metreur    = User::query()->where('email', 'metreur@charles.ci')->first();
        $direction  = User::query()->where('email', 'direction@charles.ci')->first();

        $assignments = [
            'CH-ANGRE-2024-001' => [
                [$dt,         'directeur-technique'],
                [$conducteur, 'conducteur-travaux'],
                [$chefAngre,  'chef-chantier'],
                [$metreur,    'metreur-economiste'],
            ],
            'CH-YOP-2024-002' => [
                [$dt,         'directeur-technique'],
                [$conducteur, 'conducteur-travaux'],
                [$chefYop,    'chef-chantier'],
                [$metreur,    'metreur-economiste'],
            ],
            'CH-PLAT-2025-001' => [
                [$direction,  'direction'],
                [$dt,         'directeur-technique'],
                [$conducteur, 'conducteur-travaux'],
                [$chefAngre,  'chef-chantier'],
                [$metreur,    'metreur-economiste'],
            ],
            'CH-BKE-2025-001' => [
                [$conducteur, 'conducteur-travaux'],
                [$chefYop,    'chef-chantier'],
            ],
            'CH-YMK-2025-001' => [
                [$dt,         'directeur-technique'],
                [$conducteur, 'conducteur-travaux'],
                [$chefAngre,  'chef-chantier'],
            ],
            'CH-SAN-2025-002' => [
                [$conducteur, 'conducteur-travaux'],
                [$chefYop,    'chef-chantier'],
                [$metreur,    'metreur-economiste'],
            ],
            'CH-ABO-2025-003' => [
                [$dt,         'directeur-technique'],
                [$conducteur, 'conducteur-travaux'],
                [$chefYop,    'chef-chantier'],
            ],
            'CH-MKD-2025-004' => [
                [$conducteur, 'conducteur-travaux'],
                [$chefAngre,  'chef-chantier'],
            ],
        ];

        foreach ($assignments as $code => $members) {
            $project = Project::query()->where('code', $code)->first();
            if (! $project) {
                continue;
            }

            foreach ($members as [$user, $assignmentRole]) {
                if (! $user) {
                    continue;
                }

                ProjectMember::query()->updateOrCreate(
                    ['project_id' => $project->id, 'user_id' => $user->id],
                    ['assignment_role' => $assignmentRole]
                );
            }
        }
    }
}
