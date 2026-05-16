<?php

namespace Database\Factories;

use App\Models\Project;
use App\Models\Company;
use Illuminate\Database\Eloquent\Factories\Factory;

class ProjectWorkerFactory extends Factory
{
    public function definition(): array
    {
        $trades = ['Maçon', 'Ferrailleur', 'Coffreur', 'Électricien', 'Plombier', 'Manœuvre', 'Peintre'];

        return [
            'project_id' => Project::factory(),
            'company_id' => Company::factory(),
            'name'       => $this->faker->name(),
            'trade'      => $this->faker->randomElement($trades),
            'phone'      => $this->faker->phoneNumber(),
            'is_active'  => true,
        ];
    }
}
