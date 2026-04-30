<?php

namespace Database\Factories;

use App\Models\Project;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class DailyLogFactory extends Factory
{
    public function definition(): array
    {
        return [
            'project_id' => Project::factory(),
            'user_id' => User::factory(),
            'log_date' => $this->faker->dateTimeBetween('-30 days', 'now')->format('Y-m-d'),
            'weather' => $this->faker->randomElement(['Soleil', 'Nuageux', 'Pluie', 'Orage', 'Vent fort', 'Autre']),
            'workers_count' => $this->faker->numberBetween(1, 50),
            'progress_percent' => $this->faker->randomFloat(2, 0, 100),
            'has_incident' => false,
            'incident_type' => null,
            'equipment_status' => null,
            'materials_received' => null,
        ];
    }
}
