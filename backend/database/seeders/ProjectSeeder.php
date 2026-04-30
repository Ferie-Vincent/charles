<?php

namespace Database\Seeders;

use App\Models\Company;
use App\Models\Project;
use Illuminate\Database\Seeder;

class ProjectSeeder extends Seeder
{
    public function run(): void
    {
        $company = Company::query()->where('slug', 'entreprise-charles')->firstOrFail();

        $projects = [

            // ─── Terminés ────────────────────────────────────────────────
            [
                'code'          => 'CH-ANGRE-2024-001',
                'name'          => 'Construction villa duplex R+1 – Cocody Angré',
                'status'        => 'completed',
                'location'      => 'Abidjan, Cocody Angré',
                'budget_amount' => 85_000_000,
                'start_date'    => '2024-01-15',
                'end_date'      => '2024-10-30',
            ],
            [
                'code'          => 'CH-KOU-2023-001',
                'name'          => 'Réfection façade immeuble 6 étages – Koumassi',
                'status'        => 'completed',
                'location'      => 'Abidjan, Koumassi',
                'budget_amount' => 42_000_000,
                'start_date'    => '2023-03-01',
                'end_date'      => '2023-07-31',
            ],
            [
                'code'          => 'CH-BKE-2023-002',
                'name'          => 'Pont piétonnier sur marigot – Bouaké Est',
                'status'        => 'completed',
                'location'      => 'Bouaké, Quartier Est',
                'budget_amount' => 68_000_000,
                'start_date'    => '2023-06-15',
                'end_date'      => '2024-01-20',
            ],

            // ─── Actifs ───────────────────────────────────────────────────
            [
                'code'          => 'CH-YOP-2024-002',
                'name'          => 'Immeuble R+4 locatif – Yopougon Selmer',
                'status'        => 'active',
                'location'      => 'Abidjan, Yopougon',
                'budget_amount' => 320_000_000,
                'start_date'    => '2024-06-01',
                'end_date'      => '2025-09-30',
            ],
            [
                'code'          => 'CH-PLAT-2025-001',
                'name'          => 'Centre commercial 2 niveaux – Plateau',
                'status'        => 'active',
                'location'      => 'Abidjan, Plateau',
                'budget_amount' => 1_200_000_000,
                'start_date'    => '2025-01-10',
                'end_date'      => '2026-06-30',
            ],
            [
                'code'          => 'CH-BKE-2025-001',
                'name'          => 'École primaire 6 classes – Bouaké Nord',
                'status'        => 'active',
                'location'      => 'Bouaké, Quartier Nord',
                'budget_amount' => 95_000_000,
                'start_date'    => '2025-02-03',
                'end_date'      => '2025-11-28',
            ],
            [
                'code'          => 'CH-YMK-2025-001',
                'name'          => 'Réhabilitation résidence ministérielle – Yamoussoukro',
                'status'        => 'active',
                'location'      => 'Yamoussoukro, Quartier Administratif',
                'budget_amount' => 450_000_000,
                'start_date'    => '2025-03-15',
                'end_date'      => '2026-03-14',
            ],
            [
                'code'          => 'CH-SAN-2025-002',
                'name'          => 'Entrepôt logistique 2 000 m² – San Pédro',
                'status'        => 'active',
                'location'      => 'San Pédro, Zone Portuaire',
                'budget_amount' => 280_000_000,
                'start_date'    => '2025-04-01',
                'end_date'      => '2025-12-31',
            ],
            [
                'code'          => 'CH-ABO-2025-003',
                'name'          => 'Clinique médicale R+2 – Abobo',
                'status'        => 'active',
                'location'      => 'Abidjan, Abobo',
                'budget_amount' => 560_000_000,
                'start_date'    => '2025-05-05',
                'end_date'      => '2026-08-31',
            ],
            [
                'code'          => 'CH-MKD-2025-004',
                'name'          => 'Villa triplex piscine – Marcory Résidentiel',
                'status'        => 'active',
                'location'      => 'Abidjan, Marcory',
                'budget_amount' => 175_000_000,
                'start_date'    => '2025-06-10',
                'end_date'      => '2026-02-28',
            ],
            [
                'code'          => 'CH-DLM-2025-005',
                'name'          => 'Lycée technique 12 salles – Daloa',
                'status'        => 'active',
                'location'      => 'Daloa, Centre-Ville',
                'budget_amount' => 185_000_000,
                'start_date'    => '2025-04-20',
                'end_date'      => '2026-04-19',
            ],
            [
                'code'          => 'CH-GHO-2025-006',
                'name'          => 'Résidence 20 villas standing – Grand-Bassam',
                'status'        => 'active',
                'location'      => 'Grand-Bassam, Quartier Résidentiel',
                'budget_amount' => 1_850_000_000,
                'start_date'    => '2025-03-01',
                'end_date'      => '2027-02-28',
            ],
            [
                'code'          => 'CH-KOR-2025-007',
                'name'          => 'Centre de santé rural – Korhogo',
                'status'        => 'active',
                'location'      => 'Korhogo, Zone Périphérique',
                'budget_amount' => 120_000_000,
                'start_date'    => '2025-05-15',
                'end_date'      => '2026-01-14',
            ],
            [
                'code'          => 'CH-ABJ-2025-008',
                'name'          => 'Station-service et laverie – Adjamé',
                'status'        => 'active',
                'location'      => 'Abidjan, Adjamé',
                'budget_amount' => 95_000_000,
                'start_date'    => '2025-07-01',
                'end_date'      => '2025-12-31',
            ],
            [
                'code'          => 'CH-SOB-2025-009',
                'name'          => 'Salle polyvalente 500 places – Soubré',
                'status'        => 'active',
                'location'      => 'Soubré',
                'budget_amount' => 210_000_000,
                'start_date'    => '2025-06-01',
                'end_date'      => '2026-05-31',
            ],
            [
                'code'          => 'CH-MAN-2025-010',
                'name'          => 'Hôtel 3 étoiles R+5 – Man',
                'status'        => 'active',
                'location'      => 'Man, Centre',
                'budget_amount' => 780_000_000,
                'start_date'    => '2025-08-01',
                'end_date'      => '2027-07-31',
            ],

            // ─── Draft ────────────────────────────────────────────────────
            [
                'code'          => 'CH-ABJ-2025-011',
                'name'          => 'Réfection voirie interne lotissement – Bingerville',
                'status'        => 'draft',
                'location'      => 'Bingerville',
                'budget_amount' => 48_000_000,
                'start_date'    => '2025-09-01',
                'end_date'      => '2025-12-15',
            ],
            [
                'code'          => 'CH-ABJ-2026-001',
                'name'          => 'Tour bureaux R+8 – Zone 4 Marcory',
                'status'        => 'draft',
                'location'      => 'Abidjan, Zone 4',
                'budget_amount' => 2_800_000_000,
                'start_date'    => '2026-01-15',
                'end_date'      => '2028-06-30',
            ],
            [
                'code'          => 'CH-ABJ-2026-002',
                'name'          => 'Complexe sportif municipal – Treichville',
                'status'        => 'draft',
                'location'      => 'Abidjan, Treichville',
                'budget_amount' => 650_000_000,
                'start_date'    => '2026-03-01',
                'end_date'      => '2027-09-30',
            ],
            [
                'code'          => 'CH-GGN-2026-001',
                'name'          => 'Pont routier sur fleuve Bandama – Gagnoa',
                'status'        => 'draft',
                'location'      => 'Gagnoa, Route Nationale 1',
                'budget_amount' => 3_200_000_000,
                'start_date'    => '2026-06-01',
                'end_date'      => '2029-05-31',
            ],
        ];

        foreach ($projects as $data) {
            Project::query()->updateOrCreate(
                ['company_id' => $company->id, 'code' => $data['code']],
                array_merge($data, ['company_id' => $company->id])
            );
        }
    }
}
