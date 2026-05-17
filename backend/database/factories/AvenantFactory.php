<?php

namespace Database\Factories;

use App\Models\Avenant;
use App\Models\Project;
use App\Models\Company;
use Illuminate\Database\Eloquent\Factories\Factory;

class AvenantFactory extends Factory
{
    protected $model = Avenant::class;

    public function definition(): array
    {
        return [
            'project_id' => Project::factory(),
            'company_id' => Company::factory(),
            'created_by' => \App\Models\User::factory(),
            'numero'     => 'AV-' . $this->faker->unique()->numerify('###'),
            'objet'      => $this->faker->sentence(4),
            'type'       => $this->faker->randomElement(['montant', 'delai', 'montant_et_delai']),
            'montant_ht' => $this->faker->numberBetween(50_000, 5_000_000),
            'status'     => 'brouillon',
        ];
    }
}
