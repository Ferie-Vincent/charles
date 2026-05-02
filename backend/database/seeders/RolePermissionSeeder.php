<?php

namespace Database\Seeders;

use App\Models\Company;
use App\Models\Role;
use App\Models\RolePermission;
use Illuminate\Database\Seeder;

class RolePermissionSeeder extends Seeder
{
    // Matches the hardcoded ROLE_ACCESS in frontend/src/lib/roles.ts
    private const DEFAULTS = [
        'terrain' => [
            'projects'   => true,
            'map'        => true,
            'timeline'   => true,
            'dqe'        => false,
            'execution'  => false,
            'costs'      => false,
            'accounting' => false,
            'qse'        => true,
            'reporting'  => false,
            'achats'     => false,
            'stocks'     => false,
            'besoins'    => true,
            'ged'        => true,
        ],
        'gestion' => [
            'projects'   => true,
            'map'        => false,
            'timeline'   => false,
            'dqe'        => true,
            'execution'  => true,
            'costs'      => true,
            'accounting' => true,
            'qse'        => false,
            'reporting'  => true,
            'achats'     => false,
            'stocks'     => false,
            'suppliers'  => false,
            'besoins'    => true,
            'ged'        => true,
        ],
        'logistique' => [
            'projects'   => false,
            'map'        => false,
            'timeline'   => false,
            'dqe'        => false,
            'execution'  => false,
            'costs'      => false,
            'accounting' => false,
            'qse'        => false,
            'reporting'  => false,
            'achats'     => true,
            'stocks'     => true,
            'suppliers'  => true,
            'besoins'    => true,
            'ged'        => true,
        ],
        'lecture' => [
            'projects'   => true,
            'map'        => true,
            'timeline'   => false,
            'dqe'        => false,
            'execution'  => false,
            'costs'      => false,
            'accounting' => false,
            'qse'        => false,
            'reporting'  => false,
            'achats'     => false,
            'stocks'     => false,
            'besoins'    => false,
            'ged'        => true,
        ],
    ];

    private const ROLE_GROUPS = [
        'terrain'    => ['conducteur-travaux', 'chef-chantier'],
        'gestion'    => ['metreur-economiste', 'comptable'],
        'logistique' => ['moyens-generaux'],
        'lecture'    => ['lecture-seule'],
    ];

    public function run(): void
    {
        $companies = Company::all();
        $roles     = Role::query()->pluck('id', 'name');

        foreach ($companies as $company) {
            foreach (self::ROLE_GROUPS as $group => $roleNames) {
                foreach ($roleNames as $roleName) {
                    if (!isset($roles[$roleName])) continue;
                    $roleId = $roles[$roleName];

                    foreach (self::DEFAULTS[$group] as $feature => $enabled) {
                        RolePermission::updateOrCreate(
                            ['company_id' => $company->id, 'role_id' => $roleId, 'feature' => $feature],
                            ['enabled' => $enabled]
                        );
                    }
                }
            }
        }
    }
}
