<?php

namespace Database\Seeders;

use App\Models\Company;
use App\Models\Project;
use App\Models\Supplier;
use App\Models\User;
use Illuminate\Database\Seeder;

class SupplierSeeder extends Seeder
{
    // Fournisseurs BTP ivoiriens réalistes par projet
    // contract_amount = % du budget du projet par catégorie
    private array $suppliersByProject = [
        'CH-ANGRE-2024-001' => [
            ['category' => 'fournitures', 'name' => 'CIMAF Côte d\'Ivoire', 'contact' => 'Koné Abdoulaye', 'phone' => '0022890010001', 'email' => 'commerce@cimaf-ci.com', 'pct' => 0.30],
            ['category' => 'travaux', 'name' => 'ETS BAKO & Associés', 'contact' => 'Bako Moussa', 'phone' => '0022890010002', 'email' => 'contact@bako-btp.ci', 'pct' => 0.22],
            ['category' => 'location', 'name' => 'LOXO Engins CI', 'contact' => 'Yapi Serge', 'phone' => '0022890010003', 'email' => 'info@loxo-ci.com', 'pct' => 0.12],
        ],
        'CH-KOU-2023-001' => [
            ['category' => 'fournitures', 'name' => 'SIKA Côte d\'Ivoire', 'contact' => 'Diabaté Seydou', 'phone' => '0022890020001', 'email' => 'ventes@sika-ci.com', 'pct' => 0.28],
            ['category' => 'travaux', 'name' => 'SABTP Sarl', 'contact' => 'Koué Marcel', 'phone' => '0022890020002', 'email' => 'direction@sabtp.ci', 'pct' => 0.25],
        ],
        'CH-BKE-2023-002' => [
            ['category' => 'fournitures', 'name' => 'SOTACI – Aciers CI', 'contact' => 'Gnaoré Théodore', 'phone' => '0022890030001', 'email' => 'commercial@sotaci.ci', 'pct' => 0.35],
            ['category' => 'travaux', 'name' => 'ARTIS Génie Civil', 'contact' => 'Aka Clément', 'phone' => '0022890030002', 'email' => 'info@artis-gc.ci', 'pct' => 0.28],
            ['category' => 'services', 'name' => 'SMTCI Transport', 'contact' => 'Diallo Adama', 'phone' => '0022890030003', 'email' => 'ops@smtci.ci', 'pct' => 0.08],
        ],
        'CH-YOP-2024-002' => [
            ['category' => 'fournitures', 'name' => 'CIMAF Côte d\'Ivoire', 'contact' => 'Koné Abdoulaye', 'phone' => '0022890010001', 'email' => 'commerce@cimaf-ci.com', 'pct' => 0.28],
            ['category' => 'travaux', 'name' => 'ETS COULIBALY BTP', 'contact' => 'Coulibaly Youssouf', 'phone' => '0022890040002', 'email' => 'btp@coulibaly-ci.com', 'pct' => 0.22],
            ['category' => 'location', 'name' => 'LOXO Engins CI', 'contact' => 'Yapi Serge', 'phone' => '0022890010003', 'email' => 'info@loxo-ci.com', 'pct' => 0.10],
            ['category' => 'sous-traitance', 'name' => 'ELEC SERVICES CI', 'contact' => 'Gbané Pascal', 'phone' => '0022890040004', 'email' => 'travaux@elec-services.ci', 'pct' => 0.12],
        ],
        'CH-PLAT-2025-001' => [
            ['category' => 'fournitures', 'name' => 'SOBECI Béton Prêt', 'contact' => 'Koffi Amara', 'phone' => '0022890050001', 'email' => 'beton@sobeci.ci', 'pct' => 0.32],
            ['category' => 'fournitures', 'name' => 'SOTACI – Aciers CI', 'contact' => 'Gnaoré Théodore', 'phone' => '0022890030001', 'email' => 'commercial@sotaci.ci', 'pct' => 0.15],
            ['category' => 'travaux', 'name' => 'GTI Côte d\'Ivoire', 'contact' => 'Djoman Hervé', 'phone' => '0022890050003', 'email' => 'contact@gti-ci.com', 'pct' => 0.20],
            ['category' => 'location', 'name' => 'CATERPILLAR CI Rent', 'contact' => 'Odilon Yao', 'phone' => '0022890050004', 'email' => 'location@cat-ci.com', 'pct' => 0.08],
            ['category' => 'sous-traitance', 'name' => 'MENUISERIE MODERNE CI', 'contact' => 'Ben Traoré', 'phone' => '0022890050005', 'email' => 'atelier@menus-ci.com', 'pct' => 0.06],
        ],
        'CH-BKE-2025-001' => [
            ['category' => 'fournitures', 'name' => 'CIMAF Côte d\'Ivoire', 'contact' => 'Koné Abdoulaye', 'phone' => '0022890010001', 'email' => 'commerce@cimaf-ci.com', 'pct' => 0.30],
            ['category' => 'travaux', 'name' => 'ETS TRAORÉ Construction', 'contact' => 'Traoré Bakary', 'phone' => '0022890060002', 'email' => 'btp@traore-const.ci', 'pct' => 0.25],
        ],
        'CH-YMK-2025-001' => [
            ['category' => 'fournitures', 'name' => 'SIKA Côte d\'Ivoire', 'contact' => 'Diabaté Seydou', 'phone' => '0022890020001', 'email' => 'ventes@sika-ci.com', 'pct' => 0.22],
            ['category' => 'travaux', 'name' => 'Régie BATI YMK', 'contact' => 'Camara Dieudonné', 'phone' => '0022890070002', 'email' => 'contact@bati-ymk.ci', 'pct' => 0.25],
            ['category' => 'sous-traitance', 'name' => 'SIPEM Plomberie', 'contact' => 'Assoumou Brice', 'phone' => '0022890070003', 'email' => 'info@sipem-ci.com', 'pct' => 0.10],
        ],
        'CH-SAN-2025-002' => [
            ['category' => 'fournitures', 'name' => 'AFRICA BOIS CI', 'contact' => 'Seri Brice', 'phone' => '0022890080001', 'email' => 'commerce@africa-bois.ci', 'pct' => 0.20],
            ['category' => 'travaux', 'name' => 'SAN BÂTISSEUR', 'contact' => 'Lohoué Jacques', 'phone' => '0022890080002', 'email' => 'direction@san-batisseur.ci', 'pct' => 0.25],
            ['category' => 'location', 'name' => 'LOXO Engins CI', 'contact' => 'Yapi Serge', 'phone' => '0022890010003', 'email' => 'info@loxo-ci.com', 'pct' => 0.12],
        ],
        'CH-ABO-2025-003' => [
            ['category' => 'fournitures', 'name' => 'SOBECI Béton Prêt', 'contact' => 'Koffi Amara', 'phone' => '0022890050001', 'email' => 'beton@sobeci.ci', 'pct' => 0.30],
            ['category' => 'fournitures', 'name' => 'AFRICABLE CI', 'contact' => 'Touré Issa', 'phone' => '0022890090002', 'email' => 'ventes@africable.ci', 'pct' => 0.08],
            ['category' => 'travaux', 'name' => 'GTI Côte d\'Ivoire', 'contact' => 'Djoman Hervé', 'phone' => '0022890050003', 'email' => 'contact@gti-ci.com', 'pct' => 0.22],
            ['category' => 'sous-traitance', 'name' => 'ELEC SERVICES CI', 'contact' => 'Gbané Pascal', 'phone' => '0022890040004', 'email' => 'travaux@elec-services.ci', 'pct' => 0.10],
            ['category' => 'sous-traitance', 'name' => 'SIPEM Plomberie', 'contact' => 'Assoumou Brice', 'phone' => '0022890070003', 'email' => 'info@sipem-ci.com', 'pct' => 0.08],
        ],
        'CH-MKD-2025-004' => [
            ['category' => 'fournitures', 'name' => 'CIMAF Côte d\'Ivoire', 'contact' => 'Koné Abdoulaye', 'phone' => '0022890010001', 'email' => 'commerce@cimaf-ci.com', 'pct' => 0.28],
            ['category' => 'travaux', 'name' => 'ETS BAKO & Associés', 'contact' => 'Bako Moussa', 'phone' => '0022890010002', 'email' => 'contact@bako-btp.ci', 'pct' => 0.22],
            ['category' => 'sous-traitance', 'name' => 'MENUISERIE MODERNE CI', 'contact' => 'Ben Traoré', 'phone' => '0022890050005', 'email' => 'atelier@menus-ci.com', 'pct' => 0.10],
        ],
        'CH-DLM-2025-005' => [
            ['category' => 'fournitures', 'name' => 'CIMAF Côte d\'Ivoire', 'contact' => 'Koné Abdoulaye', 'phone' => '0022890010001', 'email' => 'commerce@cimaf-ci.com', 'pct' => 0.28],
            ['category' => 'travaux', 'name' => 'ARTIS Génie Civil', 'contact' => 'Aka Clément', 'phone' => '0022890030002', 'email' => 'info@artis-gc.ci', 'pct' => 0.25],
            ['category' => 'location', 'name' => 'LOXO Engins CI', 'contact' => 'Yapi Serge', 'phone' => '0022890010003', 'email' => 'info@loxo-ci.com', 'pct' => 0.10],
        ],
        'CH-GHO-2025-006' => [
            ['category' => 'fournitures', 'name' => 'CIMAF Côte d\'Ivoire', 'contact' => 'Koné Abdoulaye', 'phone' => '0022890010001', 'email' => 'commerce@cimaf-ci.com', 'pct' => 0.25],
            ['category' => 'fournitures', 'name' => 'SOTACI – Aciers CI', 'contact' => 'Gnaoré Théodore', 'phone' => '0022890030001', 'email' => 'commercial@sotaci.ci', 'pct' => 0.12],
            ['category' => 'travaux', 'name' => 'GTI Côte d\'Ivoire', 'contact' => 'Djoman Hervé', 'phone' => '0022890050003', 'email' => 'contact@gti-ci.com', 'pct' => 0.20],
            ['category' => 'travaux', 'name' => 'ETS COULIBALY BTP', 'contact' => 'Coulibaly Youssouf', 'phone' => '0022890040002', 'email' => 'btp@coulibaly-ci.com', 'pct' => 0.10],
            ['category' => 'location', 'name' => 'CATERPILLAR CI Rent', 'contact' => 'Odilon Yao', 'phone' => '0022890050004', 'email' => 'location@cat-ci.com', 'pct' => 0.08],
        ],
        'CH-KOR-2025-007' => [
            ['category' => 'fournitures', 'name' => 'CIMAF Côte d\'Ivoire', 'contact' => 'Koné Abdoulaye', 'phone' => '0022890010001', 'email' => 'commerce@cimaf-ci.com', 'pct' => 0.30],
            ['category' => 'travaux', 'name' => 'Régie BATI KOR', 'contact' => 'Ouattara Youssouf', 'phone' => '0022890130002', 'email' => 'info@bati-kor.ci', 'pct' => 0.28],
        ],
        'CH-ABJ-2025-008' => [
            ['category' => 'fournitures', 'name' => 'SIKA Côte d\'Ivoire', 'contact' => 'Diabaté Seydou', 'phone' => '0022890020001', 'email' => 'ventes@sika-ci.com', 'pct' => 0.25],
            ['category' => 'sous-traitance', 'name' => 'ELEC SERVICES CI', 'contact' => 'Gbané Pascal', 'phone' => '0022890040004', 'email' => 'travaux@elec-services.ci', 'pct' => 0.15],
        ],
        'CH-SOB-2025-009' => [
            ['category' => 'fournitures', 'name' => 'CIMAF Côte d\'Ivoire', 'contact' => 'Koné Abdoulaye', 'phone' => '0022890010001', 'email' => 'commerce@cimaf-ci.com', 'pct' => 0.28],
            ['category' => 'travaux', 'name' => 'SABTP Sarl', 'contact' => 'Koué Marcel', 'phone' => '0022890020002', 'email' => 'direction@sabtp.ci', 'pct' => 0.25],
            ['category' => 'location', 'name' => 'LOXO Engins CI', 'contact' => 'Yapi Serge', 'phone' => '0022890010003', 'email' => 'info@loxo-ci.com', 'pct' => 0.10],
        ],
        'CH-MAN-2025-010' => [
            ['category' => 'fournitures', 'name' => 'CIMAF Côte d\'Ivoire', 'contact' => 'Koné Abdoulaye', 'phone' => '0022890010001', 'email' => 'commerce@cimaf-ci.com', 'pct' => 0.28],
            ['category' => 'travaux', 'name' => 'ETS COULIBALY BTP', 'contact' => 'Coulibaly Youssouf', 'phone' => '0022890040002', 'email' => 'btp@coulibaly-ci.com', 'pct' => 0.22],
            ['category' => 'location', 'name' => 'CATERPILLAR CI Rent', 'contact' => 'Odilon Yao', 'phone' => '0022890050004', 'email' => 'location@cat-ci.com', 'pct' => 0.10],
        ],
        'CH-ABJ-2025-011' => [
            ['category' => 'fournitures', 'name' => 'SMTCI Transport', 'contact' => 'Diallo Adama', 'phone' => '0022890030003', 'email' => 'ops@smtci.ci', 'pct' => 0.30],
            ['category' => 'travaux', 'name' => 'ETS BAKO & Associés', 'contact' => 'Bako Moussa', 'phone' => '0022890010002', 'email' => 'contact@bako-btp.ci', 'pct' => 0.28],
        ],
        'CH-ABJ-2026-001' => [
            ['category' => 'location', 'name' => 'LOXO Engins CI', 'contact' => 'Yapi Serge', 'phone' => '0022890010003', 'email' => 'info@loxo-ci.com', 'pct' => 0.08],
            ['category' => 'fournitures', 'name' => 'SOBECI Béton Prêt', 'contact' => 'Koffi Amara', 'phone' => '0022890050001', 'email' => 'beton@sobeci.ci', 'pct' => 0.30],
        ],
        'CH-ABJ-2026-002' => [
            ['category' => 'fournitures', 'name' => 'SOTACI – Aciers CI', 'contact' => 'Gnaoré Théodore', 'phone' => '0022890030001', 'email' => 'commercial@sotaci.ci', 'pct' => 0.30],
        ],
        'CH-GGN-2026-001' => [
            ['category' => 'location', 'name' => 'CATERPILLAR CI Rent', 'contact' => 'Odilon Yao', 'phone' => '0022890050004', 'email' => 'location@cat-ci.com', 'pct' => 0.05],
        ],
    ];

    public function run(): void
    {
        $company = Company::query()->where('slug', 'entreprise-charles')->firstOrFail();
        $user    = User::query()->whereHas('role', fn ($q) => $q->where('name', 'direction'))->firstOrFail();

        foreach ($this->suppliersByProject as $code => $suppliers) {
            $project = Project::query()->where('code', $code)->first();
            if (! $project) continue;

            foreach ($suppliers as $s) {
                $contractAmount = (int) round($project->budget_amount * $s['pct']);

                Supplier::query()->updateOrCreate(
                    ['project_id' => $project->id, 'name' => $s['name']],
                    [
                        'company_id'      => $company->id,
                        'created_by'      => $user->id,
                        'category'        => $s['category'],
                        'name'            => $s['name'],
                        'contact_name'    => $s['contact'],
                        'phone'           => $s['phone'],
                        'email'           => $s['email'],
                        'contract_amount' => $contractAmount,
                    ]
                );
            }
        }
    }
}
