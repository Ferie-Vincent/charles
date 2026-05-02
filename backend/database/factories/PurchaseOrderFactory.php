<?php

namespace Database\Factories;

use App\Models\Company;
use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class PurchaseOrderFactory extends Factory
{
    public function definition(): array
    {
        $company = Company::factory()->create();
        $role    = Role::query()->first();
        $user    = User::factory()->create(['company_id' => $company->id, 'role_id' => $role->id]);

        return [
            'company_id'   => $company->id,
            'requested_by' => $user->id,
            'reference'    => 'BDC-' . $this->faker->unique()->numberBetween(1000, 9999),
            'status'       => 'soumis',
            'items'        => [['description' => 'Ciment', 'quantity' => 10, 'unit' => 'sac', 'unit_price' => 5000, 'total' => 50000]],
            'total_amount' => 50000,
        ];
    }
}
