<?php

namespace Database\Seeders;

use App\Models\Company;
use App\Models\Project;
use App\Models\StockItem;
use App\Models\StockMovement;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

class StockSeeder extends Seeder
{
    private array $stockCatalog = [
        ['name' => 'Ciment CPA – sac 50 kg',       'reference' => 'MAT-CIM-001', 'category' => 'materiaux', 'unit' => 'sac',    'threshold' => 50,   'initial' => 320],
        ['name' => 'Rond à béton HA16',              'reference' => 'MAT-FER-001', 'category' => 'materiaux', 'unit' => 'tonne',  'threshold' => 2,    'initial' => 18],
        ['name' => 'Rond à béton HA12',              'reference' => 'MAT-FER-002', 'category' => 'materiaux', 'unit' => 'tonne',  'threshold' => 1,    'initial' => 12],
        ['name' => 'Sable lavé de rivière',          'reference' => 'MAT-SAB-001', 'category' => 'materiaux', 'unit' => 'm³',     'threshold' => 20,   'initial' => 85],
        ['name' => 'Gravier 5/15 concassé',          'reference' => 'MAT-GRA-001', 'category' => 'materiaux', 'unit' => 'm³',     'threshold' => 20,   'initial' => 60],
        ['name' => 'Brique creuse 20×10×20',         'reference' => 'MAT-BRQ-001', 'category' => 'materiaux', 'unit' => 'u',      'threshold' => 500,  'initial' => 4200],
        ['name' => 'Bois de coffrage (planches)',     'reference' => 'MAT-BOI-001', 'category' => 'materiaux', 'unit' => 'm²',     'threshold' => 30,   'initial' => 120],
        ['name' => 'Carrelage grès cérame 60×60',    'reference' => 'MAT-CAR-001', 'category' => 'materiaux', 'unit' => 'm²',     'threshold' => 50,   'initial' => 380],
        ['name' => 'Peinture acrylique ext. (pot 25L)', 'reference' => 'MAT-PNT-001', 'category' => 'materiaux', 'unit' => 'pot', 'threshold' => 20,   'initial' => 65],
        ['name' => 'Câble électrique 2.5mm² (rouleau)', 'reference' => 'MAT-CAB-001', 'category' => 'materiaux', 'unit' => 'rouleau', 'threshold' => 10, 'initial' => 42],
        ['name' => 'Tuyau PVC Ø110 (barre 6m)',      'reference' => 'MAT-TUY-001', 'category' => 'materiaux', 'unit' => 'barre',  'threshold' => 20,   'initial' => 88],
        ['name' => 'Fil de ligature (bobine 5kg)',   'reference' => 'MAT-LIG-001', 'category' => 'materiaux', 'unit' => 'bobine', 'threshold' => 5,    'initial' => 28],
        ['name' => 'Enduit façade – sac 25 kg',      'reference' => 'MAT-END-001', 'category' => 'materiaux', 'unit' => 'sac',    'threshold' => 30,   'initial' => 155],
        ['name' => 'Huile de décoffrage (bidon 20L)', 'reference' => 'MAT-HUI-001', 'category' => 'materiaux', 'unit' => 'bidon', 'threshold' => 5,    'initial' => 22],
        ['name' => 'Disque à tronçonner (boîte 25)', 'reference' => 'OUT-DIS-001', 'category' => 'consommables', 'unit' => 'boîte',  'threshold' => 3,    'initial' => 12],
        ['name' => 'Casques chantier (unité)',        'reference' => 'SEC-CAS-001', 'category' => 'consommables',       'unit' => 'u',      'threshold' => 10,   'initial' => 35],
        ['name' => 'Gants de protection (paire)',     'reference' => 'SEC-GAN-001', 'category' => 'consommables',       'unit' => 'paire',  'threshold' => 20,   'initial' => 80],
        ['name' => 'Chaussures de sécurité (paire)', 'reference' => 'SEC-CHA-001', 'category' => 'consommables',       'unit' => 'paire',  'threshold' => 10,   'initial' => 25],
    ];

    public function run(): void
    {
        $company  = Company::query()->where('slug', 'entreprise-charles')->firstOrFail();
        $director = User::query()->whereHas('role', fn ($q) => $q->where('name', 'direction'))->firstOrFail();
        $logi     = User::query()->whereHas('role', fn ($q) => $q->where('name', 'conducteur-travaux'))->first() ?? $director;

        // Projet de référence pour les sorties
        $mainProjects = Project::query()->where('status', 'active')
            ->whereIn('code', ['CH-PLAT-2025-001', 'CH-GHO-2025-006', 'CH-YOP-2024-002', 'CH-ABO-2025-003'])
            ->get();

        $today = Carbon::today();

        foreach ($this->stockCatalog as $itemData) {
            $item = StockItem::query()->updateOrCreate(
                ['company_id' => $company->id, 'reference' => $itemData['reference']],
                [
                    'created_by' => $director->id,
                    'name'       => $itemData['name'],
                    'category'   => $itemData['category'] ?? null,
                    'unit'       => $itemData['unit'],
                    'quantity'   => 0,
                    'threshold'  => $itemData['threshold'],
                ]
            );

            // Entrée initiale (livraison fournisseur)
            StockMovement::query()->updateOrCreate(
                ['stock_item_id' => $item->id, 'reason' => 'Approvisionnement initial – stock de départ'],
                [
                    'created_by'    => $director->id,
                    'type'          => 'entree',
                    'quantity'      => $itemData['initial'],
                    'movement_date' => $today->copy()->subMonths(4)->toDateString(),
                    'notes'         => 'Stock initial constitué',
                ]
            );

            // Sorties vers chantiers (réparties sur les 4 projets principaux)
            $totalOut = (int) round($itemData['initial'] * 0.55);
            if ($totalOut > 0 && $mainProjects->isNotEmpty()) {
                $perProject = max(1, intdiv($totalOut, $mainProjects->count()));
                foreach ($mainProjects as $idx => $proj) {
                    StockMovement::query()->updateOrCreate(
                        ['stock_item_id' => $item->id, 'project_id' => $proj->id],
                        [
                            'created_by'    => $logi->id,
                            'type'          => 'sortie',
                            'quantity'      => $perProject,
                            'reason'        => 'Consommation chantier',
                            'movement_date' => $today->copy()->subMonths(3 - $idx)->toDateString(),
                            'notes'         => 'Sortie en cours de travaux',
                        ]
                    );
                }
            }

            // Réajustement inventaire mensuel (adjustment)
            if ($itemData['category'] === 'materiaux') {
                StockMovement::query()->updateOrCreate(
                    ['stock_item_id' => $item->id, 'reason' => 'Inventaire mensuel – ajustement'],
                    [
                        'created_by'    => $logi->id,
                        'type'          => 'ajustement',
                        'quantity'      => -2,
                        'movement_date' => $today->copy()->subDays(15)->toDateString(),
                        'notes'         => 'Écart constaté à l\'inventaire physique',
                    ]
                );
            }

            // Recalculate quantity from movements
            $qty = StockMovement::query()
                ->where('stock_item_id', $item->id)
                ->get()
                ->sum(fn ($m) => $m->type === 'entree' ? $m->quantity : -$m->quantity);

            $item->update(['quantity' => max(0, $qty)]);
        }
    }
}
