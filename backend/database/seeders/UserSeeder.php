<?php

namespace Database\Seeders;

use App\Models\Company;
use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        $company = Company::query()->firstOrCreate(
            ['slug' => 'entreprise-charles'],
            ['name' => 'Entreprise Charles']
        );

        $roles = Role::query()->pluck('id', 'name');

        $users = [
            [
                'name'       => 'Direction Charles',
                'email'      => 'direction@charles.ci',
                'role'       => 'direction',
            ],
            [
                'name'       => 'Konan Directeur Technique',
                'email'      => 'dt@charles.ci',
                'role'       => 'directeur-technique',
            ],
            [
                'name'       => 'Bamba Conducteur Travaux',
                'email'      => 'conducteur@charles.ci',
                'role'       => 'conducteur-travaux',
            ],
            [
                'name'       => 'Coulibaly Chef Chantier Angré',
                'email'      => 'chef.angre@charles.ci',
                'role'       => 'chef-chantier',
            ],
            [
                'name'       => 'Ouattara Chef Chantier Yopougon',
                'email'      => 'chef.yop@charles.ci',
                'role'       => 'chef-chantier',
            ],
            [
                'name'       => 'Diallo Métreur',
                'email'      => 'metreur@charles.ci',
                'role'       => 'metreur-economiste',
            ],
            [
                'name'       => 'Traoré Comptable',
                'email'      => 'comptable@charles.ci',
                'role'       => 'comptable',
            ],
        ];

        foreach ($users as $data) {
            User::query()->updateOrCreate(
                ['email' => $data['email']],
                [
                    'name'       => $data['name'],
                    'password'   => Hash::make('password'),
                    'company_id' => $company->id,
                    'role_id'    => $roles[$data['role']],
                ]
            );
        }
    }
}
