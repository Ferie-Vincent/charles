<?php

namespace Database\Seeders;

use App\Models\Company;
use App\Models\Project;
use App\Models\PurchaseOrder;
use App\Models\Supplier;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

class PurchaseOrderSeeder extends Seeder
{
    public function run(): void
    {
        $company  = Company::query()->where('slug', 'entreprise-charles')->firstOrFail();
        $director = User::query()->whereHas('role', fn ($q) => $q->where('name', 'direction'))->firstOrFail();
        $conduc   = User::query()->whereHas('role', fn ($q) => $q->where('name', 'conducteur-travaux'))->first() ?? $director;

        $projects = Project::query()->where('status', 'active')->with('suppliers')->get();
        $ref      = 1;

        foreach ($projects as $project) {
            $suppliers = $project->suppliers;
            if ($suppliers->isEmpty()) continue;

            $budget   = $project->budget_amount;
            $progress = $project->current_progress / 100;
            $start    = Carbon::parse($project->start_date);

            // BDC 1 – Matériaux gros œuvre (toujours reçu)
            $matSupplier = $suppliers->where('category', 'fournitures')->first() ?? $suppliers->first();
            $bdc1Amount  = round($budget * $progress * 0.30);

            $this->createBDC($company, $project, $conduc, $director, $matSupplier, [
                'reference' => 'BDC-' . str_pad($ref++, 5, '0', STR_PAD_LEFT),
                'status'    => 'recu',
                'items'     => [
                    ['name' => 'Ciment CPA (sacs 50kg)', 'qty' => 500, 'unit' => 'sac', 'unit_price' => 12500, 'total' => 6_250_000],
                    ['name' => 'Sable lavé', 'qty' => 80, 'unit' => 'm³', 'unit_price' => 35000, 'total' => 2_800_000],
                    ['name' => 'Gravier 5/15', 'qty' => 60, 'unit' => 'm³', 'unit_price' => 40000, 'total' => 2_400_000],
                ],
                'total_amount'      => min($bdc1Amount, 11_450_000),
                'expected_delivery' => $start->copy()->addMonths(1)->toDateString(),
                'approved_at'       => $start->copy()->addMonths(1)->addDays(2),
                'received_at'       => $start->copy()->addMonths(1)->addDays(7),
                'approved_by'       => $director->id,
                'notes'             => 'Fournitures gros œuvre – lot initial',
            ]);

            // BDC 2 – Ferraillage (reçu si progress > 30%)
            if ($progress > 0.30) {
                $ferSupplier = $suppliers->where('category', 'fournitures')->first() ?? $suppliers->first();
                $bdc2Amount  = round($budget * 0.08);

                $this->createBDC($company, $project, $conduc, $director, $ferSupplier, [
                    'reference' => 'BDC-' . str_pad($ref++, 5, '0', STR_PAD_LEFT),
                    'status'    => 'recu',
                    'items'     => [
                        ['name' => 'Rond à béton HA16', 'qty' => 5, 'unit' => 'tonne', 'unit_price' => 550000, 'total' => 2_750_000],
                        ['name' => 'Rond à béton HA12', 'qty' => 3, 'unit' => 'tonne', 'unit_price' => 530000, 'total' => 1_590_000],
                        ['name' => 'Fil de ligature', 'qty' => 50, 'unit' => 'kg', 'unit_price' => 1800, 'total' => 90_000],
                    ],
                    'total_amount'      => min($bdc2Amount, 4_430_000),
                    'expected_delivery' => $start->copy()->addMonths(3)->toDateString(),
                    'approved_at'       => $start->copy()->addMonths(3)->addDays(1),
                    'received_at'       => $start->copy()->addMonths(3)->addDays(5),
                    'approved_by'       => $director->id,
                    'notes'             => 'Ferraillage planchers et poteaux',
                ]);
            }

            // BDC 3 – Équipements location (approuvé non reçu si progress > 20%)
            $equip = $suppliers->where('category', 'location')->first();
            if ($equip && $progress > 0.20) {
                $status = $progress > 0.50 ? 'recu' : 'approuve';
                $this->createBDC($company, $project, $conduc, $director, $equip, [
                    'reference' => 'BDC-' . str_pad($ref++, 5, '0', STR_PAD_LEFT),
                    'status'    => $status,
                    'items'     => [
                        ['name' => 'Location bétonnière 500L', 'qty' => 2, 'unit' => 'mois', 'unit_price' => 350000, 'total' => 700_000],
                        ['name' => 'Location grue mobile', 'qty' => 1, 'unit' => 'mois', 'unit_price' => 1_200_000, 'total' => 1_200_000],
                    ],
                    'total_amount'      => 1_900_000,
                    'expected_delivery' => $start->copy()->addMonths(2)->toDateString(),
                    'approved_at'       => $start->copy()->addMonths(2),
                    'received_at'       => $status === 'recu' ? $start->copy()->addMonths(2)->addDays(3) : null,
                    'approved_by'       => $director->id,
                    'notes'             => 'Location matériel de levage et malaxage',
                ]);
            }

            // BDC 4 – Pending (en cours d'approbation)
            if ($progress > 0.40) {
                $pendingSupplier = $suppliers->last();
                $this->createBDC($company, $project, $conduc, null, $pendingSupplier, [
                    'reference' => 'BDC-' . str_pad($ref++, 5, '0', STR_PAD_LEFT),
                    'status'    => 'soumis',
                    'items'     => [
                        ['name' => 'Briques creuses 20×10×20', 'qty' => 2000, 'unit' => 'u', 'unit_price' => 450, 'total' => 900_000],
                        ['name' => 'Enduit de façade sac 25kg', 'qty' => 100, 'unit' => 'sac', 'unit_price' => 8500, 'total' => 850_000],
                    ],
                    'total_amount'      => 1_750_000,
                    'expected_delivery' => Carbon::today()->addDays(14)->toDateString(),
                    'approved_at'       => null,
                    'received_at'       => null,
                    'approved_by'       => null,
                    'notes'             => 'Maçonnerie cloisons intérieures',
                ]);
            }
        }
    }

    private function createBDC(
        $company, $project, $requester, $approver, $supplier, array $data
    ): void {
        PurchaseOrder::query()->updateOrCreate(
            ['project_id' => $project->id, 'reference' => $data['reference']],
            [
                'company_id'        => $company->id,
                'requested_by'      => $requester->id,
                'supplier_id'       => $supplier?->id,
                'approved_by'       => $data['approved_by'],
                'status'            => $data['status'],
                'items'             => $data['items'],
                'total_amount'      => $data['total_amount'],
                'expected_delivery' => $data['expected_delivery'],
                'approved_at'       => $data['approved_at'],
                'received_at'       => $data['received_at'],
                'notes'             => $data['notes'],
                'reception_notes'   => $data['status'] === 'recu' ? 'Marchandises conformes à la commande.' : null,
            ]
        );
    }
}
