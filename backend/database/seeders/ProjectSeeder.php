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
                'latitude'      => 5.3527,
                'longitude'     => -3.9807,
                'budget_amount' => 85_000_000,
                'start_date'    => '2024-01-15',
                'end_date'      => '2024-10-30',
            ],
            [
                'code'          => 'CH-KOU-2023-001',
                'name'          => 'Réfection façade immeuble 6 étages – Koumassi',
                'status'        => 'completed',
                'location'      => 'Abidjan, Koumassi',
                'latitude'      => 5.3133,
                'longitude'     => -3.9575,
                'budget_amount' => 42_000_000,
                'start_date'    => '2023-03-01',
                'end_date'      => '2023-07-31',
            ],
            [
                'code'          => 'CH-BKE-2023-002',
                'name'          => 'Pont piétonnier sur marigot – Bouaké Est',
                'status'        => 'completed',
                'location'      => 'Bouaké, Quartier Est',
                'latitude'      => 7.6906,
                'longitude'     => -5.0200,
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
                'latitude'      => 5.3429,
                'longitude'     => -4.0755,
                'budget_amount' => 320_000_000,
                'start_date'    => '2024-06-01',
                'end_date'      => '2025-09-30',
            ],
            [
                'code'          => 'CH-PLAT-2025-001',
                'name'          => 'Centre commercial 2 niveaux – Plateau',
                'status'        => 'active',
                'location'      => 'Abidjan, Plateau',
                'latitude'      => 5.3197,
                'longitude'     => -4.0169,
                'budget_amount' => 1_200_000_000,
                'start_date'    => '2025-01-10',
                'end_date'      => '2026-06-30',
            ],
            [
                'code'          => 'CH-BKE-2025-001',
                'name'          => 'École primaire 6 classes – Bouaké Nord',
                'status'        => 'active',
                'location'      => 'Bouaké, Quartier Nord',
                'latitude'      => 7.7100,
                'longitude'     => -5.0350,
                'budget_amount' => 95_000_000,
                'start_date'    => '2025-02-03',
                'end_date'      => '2025-11-28',
            ],
            [
                'code'          => 'CH-YMK-2025-001',
                'name'          => 'Réhabilitation résidence ministérielle – Yamoussoukro',
                'status'        => 'active',
                'location'      => 'Yamoussoukro, Quartier Administratif',
                'latitude'      => 6.8206,
                'longitude'     => -5.2793,
                'budget_amount' => 450_000_000,
                'start_date'    => '2025-03-15',
                'end_date'      => '2026-03-14',
            ],
            [
                'code'          => 'CH-SAN-2025-002',
                'name'          => 'Entrepôt logistique 2 000 m² – San Pédro',
                'status'        => 'active',
                'location'      => 'San Pédro, Zone Portuaire',
                'latitude'      => 4.7485,
                'longitude'     => -6.6363,
                'budget_amount' => 280_000_000,
                'start_date'    => '2025-04-01',
                'end_date'      => '2025-12-31',
            ],
            [
                'code'          => 'CH-ABO-2025-003',
                'name'          => 'Clinique médicale R+2 – Abobo',
                'status'        => 'active',
                'location'      => 'Abidjan, Abobo',
                'latitude'      => 5.4159,
                'longitude'     => -4.0086,
                'budget_amount' => 560_000_000,
                'start_date'    => '2025-05-05',
                'end_date'      => '2026-08-31',
            ],
            [
                'code'          => 'CH-MKD-2025-004',
                'name'          => 'Villa triplex piscine – Marcory Résidentiel',
                'status'        => 'active',
                'location'      => 'Abidjan, Marcory',
                'latitude'      => 5.3025,
                'longitude'     => -3.9669,
                'budget_amount' => 175_000_000,
                'start_date'    => '2025-06-10',
                'end_date'      => '2026-02-28',
            ],
            [
                'code'          => 'CH-DLM-2025-005',
                'name'          => 'Lycée technique 12 salles – Daloa',
                'status'        => 'active',
                'location'      => 'Daloa, Centre-Ville',
                'latitude'      => 6.8773,
                'longitude'     => -6.4502,
                'budget_amount' => 185_000_000,
                'start_date'    => '2025-04-20',
                'end_date'      => '2026-04-19',
            ],
            [
                'code'          => 'CH-GHO-2025-006',
                'name'          => 'Résidence 20 villas standing – Grand-Bassam',
                'status'        => 'active',
                'location'      => 'Grand-Bassam, Quartier Résidentiel',
                'latitude'      => 5.2037,
                'longitude'     => -3.7343,
                'budget_amount' => 1_850_000_000,
                'start_date'    => '2025-03-01',
                'end_date'      => '2027-02-28',
            ],
            [
                'code'          => 'CH-KOR-2025-007',
                'name'          => 'Centre de santé rural – Korhogo',
                'status'        => 'active',
                'location'      => 'Korhogo, Zone Périphérique',
                'latitude'      => 9.4580,
                'longitude'     => -5.6295,
                'budget_amount' => 120_000_000,
                'start_date'    => '2025-05-15',
                'end_date'      => '2026-01-14',
            ],
            [
                'code'          => 'CH-ABJ-2025-008',
                'name'          => 'Station-service et laverie – Adjamé',
                'status'        => 'active',
                'location'      => 'Abidjan, Adjamé',
                'latitude'      => 5.3570,
                'longitude'     => -4.0176,
                'budget_amount' => 95_000_000,
                'start_date'    => '2025-07-01',
                'end_date'      => '2025-12-31',
            ],
            [
                'code'          => 'CH-SOB-2025-009',
                'name'          => 'Salle polyvalente 500 places – Soubré',
                'status'        => 'active',
                'location'      => 'Soubré',
                'latitude'      => 5.7851,
                'longitude'     => -6.5909,
                'budget_amount' => 210_000_000,
                'start_date'    => '2025-06-01',
                'end_date'      => '2026-05-31',
            ],
            [
                'code'          => 'CH-MAN-2025-010',
                'name'          => 'Hôtel 3 étoiles R+5 – Man',
                'status'        => 'active',
                'location'      => 'Man, Centre',
                'latitude'      => 7.4124,
                'longitude'     => -7.5537,
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
                'latitude'      => 5.3580,
                'longitude'     => -3.8870,
                'budget_amount' => 48_000_000,
                'start_date'    => '2025-09-01',
                'end_date'      => '2025-12-15',
            ],
            [
                'code'          => 'CH-ABJ-2026-001',
                'name'          => 'Tour bureaux R+8 – Zone 4 Marcory',
                'status'        => 'draft',
                'location'      => 'Abidjan, Zone 4',
                'latitude'      => 5.2950,
                'longitude'     => -3.9700,
                'budget_amount' => 2_800_000_000,
                'start_date'    => '2026-01-15',
                'end_date'      => '2028-06-30',
            ],
            [
                'code'          => 'CH-ABJ-2026-002',
                'name'          => 'Complexe sportif municipal – Treichville',
                'status'        => 'draft',
                'location'      => 'Abidjan, Treichville',
                'latitude'      => 5.3013,
                'longitude'     => -3.9942,
                'budget_amount' => 650_000_000,
                'start_date'    => '2026-03-01',
                'end_date'      => '2027-09-30',
            ],
            [
                'code'          => 'CH-GGN-2026-001',
                'name'          => 'Pont routier sur fleuve Bandama – Gagnoa',
                'status'        => 'draft',
                'location'      => 'Gagnoa, Route Nationale 1',
                'latitude'      => 5.9392,
                'longitude'     => -5.9492,
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
