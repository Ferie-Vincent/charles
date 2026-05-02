<?php

namespace Database\Factories;

use App\Models\Company;
use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class StockItemFactory extends Factory
{
    public function definition(): array
    {
        $company = Company::factory()->create();
        $role    = Role::query()->first();
        $user    = User::factory()->create(['company_id' => $company->id, 'role_id' => $role->id]);

        return [
            'company_id' => $company->id,
            'created_by' => $user->id,
            'name'       => $this->faker->word(),
            'unit'       => 'sac',
            'quantity'   => $this->faker->randomFloat(2, 0, 100),
            'threshold'  => 10,
        ];
    }
}
