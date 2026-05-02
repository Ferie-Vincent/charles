<?php

namespace Database\Seeders;

use App\Models\Role;
use Illuminate\Database\Seeder;

class RoleSeeder extends Seeder
{
    public function run(): void
    {
        $roles = [
            ['name' => 'direction', 'label' => 'Direction'],
            ['name' => 'directeur-technique', 'label' => 'Directeur technique'],
            ['name' => 'conducteur-travaux', 'label' => 'Conducteur de travaux'],
            ['name' => 'chef-chantier', 'label' => 'Chef de chantier'],
            ['name' => 'metreur-economiste', 'label' => 'Métreur / économiste'],
            ['name' => 'comptable', 'label' => 'Comptable'],
            ['name' => 'moyens-generaux', 'label' => 'Moyens Généraux'],
            ['name' => 'lecture-seule', 'label' => 'Lecture seule'],
        ];

        foreach ($roles as $role) {
            Role::query()->updateOrCreate(
                ['name' => $role['name']],
                ['label' => $role['label']]
            );
        }
    }
}
