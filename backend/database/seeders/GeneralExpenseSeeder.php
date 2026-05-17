<?php

namespace Database\Seeders;

use App\Models\Company;
use App\Models\GeneralExpense;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

class GeneralExpenseSeeder extends Seeder
{
    private array $expenses = [
        ['category' => 'charges',  'label' => 'Loyer bureau direction – mai 2025',           'amount' => 450_000,   'months_ago' => 12],
        ['category' => 'charges',  'label' => 'Loyer bureau direction – juin 2025',           'amount' => 450_000,   'months_ago' => 11],
        ['category' => 'charges',  'label' => 'Loyer bureau direction – juillet 2025',        'amount' => 450_000,   'months_ago' => 10],
        ['category' => 'charges',  'label' => 'Loyer bureau direction – août 2025',           'amount' => 450_000,   'months_ago' => 9],
        ['category' => 'charges',  'label' => 'Loyer bureau direction – septembre 2025',      'amount' => 450_000,   'months_ago' => 8],
        ['category' => 'charges',  'label' => 'Loyer bureau direction – octobre 2025',        'amount' => 450_000,   'months_ago' => 7],
        ['category' => 'charges',  'label' => 'Loyer bureau direction – novembre 2025',       'amount' => 450_000,   'months_ago' => 6],
        ['category' => 'charges',  'label' => 'Loyer bureau direction – décembre 2025',       'amount' => 450_000,   'months_ago' => 5],
        ['category' => 'charges',  'label' => 'Loyer bureau direction – janvier 2026',        'amount' => 500_000,   'months_ago' => 4],
        ['category' => 'charges',  'label' => 'Loyer bureau direction – février 2026',        'amount' => 500_000,   'months_ago' => 3],
        ['category' => 'charges',  'label' => 'Loyer bureau direction – mars 2026',           'amount' => 500_000,   'months_ago' => 2],
        ['category' => 'charges',  'label' => 'Loyer bureau direction – avril 2026',          'amount' => 500_000,   'months_ago' => 1],
        ['category' => 'transport',       'label' => 'Carburant véhicule DG – trimestre Q3 2025',   'amount' => 380_000,   'months_ago' => 8],
        ['category' => 'transport',       'label' => 'Carburant véhicule DG – trimestre Q4 2025',   'amount' => 410_000,   'months_ago' => 4],
        ['category' => 'transport',       'label' => 'Carburant véhicule DG – trimestre Q1 2026',   'amount' => 395_000,   'months_ago' => 1],
        ['category' => 'transport',       'label' => 'Entretien pickup DT – vidange + pneus',        'amount' => 285_000,   'months_ago' => 5],
        ['category' => 'transport',       'label' => 'Entretien pickup conducteur travaux',          'amount' => 175_000,   'months_ago' => 3],
        ['category' => 'fournitures',      'label' => 'Achat ordinateurs portables (2) – bureau',    'amount' => 1_250_000, 'months_ago' => 10],
        ['category' => 'fournitures',      'label' => 'Imprimante A3 bureau technique',               'amount' => 320_000,   'months_ago' => 9],
        ['category' => 'fournitures',      'label' => 'Licences logiciels BTP (AutoCAD + MS365)',     'amount' => 850_000,   'months_ago' => 6],
        ['category' => 'communication',   'label' => 'Forfait téléphonie entreprise – S2 2025',      'amount' => 360_000,   'months_ago' => 6],
        ['category' => 'communication',   'label' => 'Forfait téléphonie entreprise – S1 2026',      'amount' => 380_000,   'months_ago' => 1],
        ['category' => 'fournitures',       'label' => 'Formation sécurité chantier (30 ouvriers)',    'amount' => 750_000,   'months_ago' => 7],
        ['category' => 'fournitures',       'label' => 'Séminaire gestion de projets – direction',     'amount' => 480_000,   'months_ago' => 4],
        ['category' => 'charges',      'label' => 'Prime assurance RC Décennale 2025-2026',       'amount' => 2_800_000, 'months_ago' => 12],
        ['category' => 'charges',      'label' => 'Prime assurance flotte véhicules 2025-2026',   'amount' => 680_000,   'months_ago' => 12],
        ['category' => 'charges',       'label' => 'Honoraires cabinet juridique – Q3 2025',       'amount' => 500_000,   'months_ago' => 8],
        ['category' => 'charges',       'label' => 'Honoraires cabinet juridique – Q1 2026',       'amount' => 500_000,   'months_ago' => 1],
        ['category' => 'charges', 'label' => 'Frais bancaires – SGCI S2 2025',               'amount' => 125_000,   'months_ago' => 5],
        ['category' => 'charges', 'label' => 'Frais bancaires – SGCI S1 2026',               'amount' => 130_000,   'months_ago' => 0],
    ];

    public function run(): void
    {
        $company  = Company::query()->where('slug', 'entreprise-charles')->firstOrFail();
        $director = User::query()->whereHas('role', fn ($q) => $q->where('name', 'direction'))->firstOrFail();
        $comptable= User::query()->whereHas('role', fn ($q) => $q->where('name', 'comptable'))->first() ?? $director;

        foreach ($this->expenses as $exp) {
            $expDate = Carbon::today()->subMonths($exp['months_ago'])->startOfMonth();
            $status  = $exp['months_ago'] > 0 ? 'approuvee' : 'en_attente';

            GeneralExpense::query()->updateOrCreate(
                ['company_id' => $company->id, 'label' => $exp['label']],
                [
                    'created_by'  => $comptable->id,
                    'category'    => $exp['category'],
                    'label'       => $exp['label'],
                    'amount'      => $exp['amount'],
                    'expense_date'=> $expDate->toDateString(),
                    'paid_by'     => 'Virement SGCI',
                    'status'      => $status,
                    'approver_id' => $status === 'approuvee' ? $director->id : null,
                    'approved_at' => $status === 'approuvee' ? $expDate->copy()->addDays(3) : null,
                ]
            );
        }
    }
}
