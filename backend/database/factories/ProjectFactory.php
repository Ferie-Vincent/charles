<?php

namespace Database\Factories;

use App\Models\Company;
use Illuminate\Database\Eloquent\Factories\Factory;

class ProjectFactory extends Factory
{
    public function definition(): array
    {
        return [
            'company_id' => Company::factory(),
            'code' => 'CH-' . strtoupper($this->faker->lexify('????')) . '-' . $this->faker->year() . '-' . $this->faker->numberBetween(1, 999),
            'name' => $this->faker->sentence(4),
            'status' => $this->faker->randomElement(['draft', 'active']),
            'location' => $this->faker->city(),
            'budget_amount' => $this->faker->randomFloat(2, 1000000, 500000000),
            'start_date' => $this->faker->dateTimeBetween('-1 year', 'now'),
            'end_date' => $this->faker->dateTimeBetween('now', '+2 years'),
        ];
    }
}
