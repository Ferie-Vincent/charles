<?php

namespace Database\Seeders;

use App\Models\Company;
use App\Models\Project;
use App\Models\ProjectWorker;
use Illuminate\Database\Seeder;

class ProjectWorkerSeeder extends Seeder
{
    private array $workersByProject = [
        'CH-ANGRE-2024-001' => [
            ['name' => 'Kouassi Yao', 'trade' => 'Maçon', 'phone' => '0707000001'],
            ['name' => 'Bamba Oumar', 'trade' => 'Coffreur', 'phone' => '0707000002'],
            ['name' => 'Traoré Salif', 'trade' => 'Ferrailleur', 'phone' => '0707000003'],
            ['name' => 'N\'Guessan Konan', 'trade' => 'Manœuvre', 'phone' => '0707000004'],
            ['name' => 'Diabaté Mamadou', 'trade' => 'Carreleur', 'phone' => '0707000005'],
        ],
        'CH-KOU-2023-001' => [
            ['name' => 'Coulibaly Ibrahim', 'trade' => 'Façadier', 'phone' => '0707000010'],
            ['name' => 'Diallo Seydou', 'trade' => 'Peintre', 'phone' => '0707000011'],
            ['name' => 'Touré Lamine', 'trade' => 'Maçon', 'phone' => '0707000012'],
            ['name' => 'Koné Adama', 'trade' => 'Manœuvre', 'phone' => '0707000013'],
        ],
        'CH-BKE-2023-002' => [
            ['name' => 'Akoto Koffi', 'trade' => 'Charpentier', 'phone' => '0707000020'],
            ['name' => 'Yeboah Kwame', 'trade' => 'Maçon', 'phone' => '0707000021'],
            ['name' => 'Assi Gbeto', 'trade' => 'Ferrailleur', 'phone' => '0707000022'],
            ['name' => 'Zagbé Laurent', 'trade' => 'Manœuvre', 'phone' => '0707000023'],
        ],
        'CH-YOP-2024-002' => [
            ['name' => 'Koffi Aman', 'trade' => 'Chef d\'équipe', 'phone' => '0707000030'],
            ['name' => 'Soro Tidiane', 'trade' => 'Coffreur', 'phone' => '0707000031'],
            ['name' => 'Ouattara Drissa', 'trade' => 'Ferrailleur', 'phone' => '0707000032'],
            ['name' => 'Gnahoré Arsène', 'trade' => 'Maçon', 'phone' => '0707000033'],
            ['name' => 'Amoah Ekow', 'trade' => 'Électricien', 'phone' => '0707000034'],
            ['name' => 'Logbo Pascal', 'trade' => 'Plombier', 'phone' => '0707000035'],
            ['name' => 'Tano Ange', 'trade' => 'Manœuvre', 'phone' => '0707000036'],
            ['name' => 'Méité Souleymane', 'trade' => 'Manœuvre', 'phone' => '0707000037'],
        ],
        'CH-PLAT-2025-001' => [
            ['name' => 'Djoman Hervé', 'trade' => 'Chef d\'équipe gros œuvre', 'phone' => '0707000040'],
            ['name' => 'Ehui René', 'trade' => 'Coffreur bancheur', 'phone' => '0707000041'],
            ['name' => 'Assoumou Pierre', 'trade' => 'Ferrailleur', 'phone' => '0707000042'],
            ['name' => 'Gbané Séraphin', 'trade' => 'Maçon', 'phone' => '0707000043'],
            ['name' => 'Dagoulet Clément', 'trade' => 'Électricien', 'phone' => '0707000044'],
            ['name' => 'Brito Carlos', 'trade' => 'Plombier CVC', 'phone' => '0707000045'],
            ['name' => 'Fofana Moussa', 'trade' => 'Carreleur', 'phone' => '0707000046'],
            ['name' => 'Zokou Gnamien', 'trade' => 'Peintre', 'phone' => '0707000047'],
            ['name' => 'Ouédraogo Boubacar', 'trade' => 'Manœuvre', 'phone' => '0707000048'],
            ['name' => 'Sawadogo Issouf', 'trade' => 'Manœuvre', 'phone' => '0707000049'],
        ],
        'CH-BKE-2025-001' => [
            ['name' => 'Traoré Ousseni', 'trade' => 'Maçon', 'phone' => '0707000050'],
            ['name' => 'Sanogo Moussa', 'trade' => 'Ferrailleur', 'phone' => '0707000051'],
            ['name' => 'Coulibaly Siriki', 'trade' => 'Manœuvre', 'phone' => '0707000052'],
            ['name' => 'Bakayoko Sekou', 'trade' => 'Coffreur', 'phone' => '0707000053'],
            ['name' => 'Doumbia Lamine', 'trade' => 'Maçon', 'phone' => '0707000054'],
        ],
        'CH-YMK-2025-001' => [
            ['name' => 'Camara Aboubacar', 'trade' => 'Chef d\'équipe', 'phone' => '0707000060'],
            ['name' => 'Diomandé Sébastien', 'trade' => 'Maçon', 'phone' => '0707000061'],
            ['name' => 'Konaté Issa', 'trade' => 'Carreleur', 'phone' => '0707000062'],
            ['name' => 'Bah Mamadou', 'trade' => 'Peintre', 'phone' => '0707000063'],
            ['name' => 'Kouyaté Daouda', 'trade' => 'Électricien', 'phone' => '0707000064'],
            ['name' => 'Bocoum Hamidou', 'trade' => 'Plombier', 'phone' => '0707000065'],
        ],
        'CH-SAN-2025-002' => [
            ['name' => 'Gnagné Marcel', 'trade' => 'Chef d\'équipe', 'phone' => '0707000070'],
            ['name' => 'Deblé Justin', 'trade' => 'Maçon', 'phone' => '0707000071'],
            ['name' => 'Gohouri Cyrille', 'trade' => 'Ferrailleur', 'phone' => '0707000072'],
            ['name' => 'Kpan Hubert', 'trade' => 'Charpentier métallique', 'phone' => '0707000073'],
            ['name' => 'Konan Firmin', 'trade' => 'Manœuvre', 'phone' => '0707000074'],
            ['name' => 'Zagba Stanislas', 'trade' => 'Manœuvre', 'phone' => '0707000075'],
        ],
        'CH-ABO-2025-003' => [
            ['name' => 'Attié Séraphin', 'trade' => 'Chef d\'équipe', 'phone' => '0707000080'],
            ['name' => 'Yao Kouadio', 'trade' => 'Coffreur', 'phone' => '0707000081'],
            ['name' => 'Atta Konan', 'trade' => 'Ferrailleur', 'phone' => '0707000082'],
            ['name' => 'Amani Jean-Louis', 'trade' => 'Maçon', 'phone' => '0707000083'],
            ['name' => 'Dali Tanon', 'trade' => 'Plombier', 'phone' => '0707000084'],
            ['name' => 'Kassi Firmin', 'trade' => 'Électricien', 'phone' => '0707000085'],
            ['name' => 'Eba Niamkey', 'trade' => 'Manœuvre', 'phone' => '0707000086'],
        ],
        'CH-MKD-2025-004' => [
            ['name' => 'Kouamé Auguste', 'trade' => 'Maçon', 'phone' => '0707000090'],
            ['name' => 'N\'Dri Barnabé', 'trade' => 'Carreleur', 'phone' => '0707000091'],
            ['name' => 'Abidji Cyrille', 'trade' => 'Ferrailleur', 'phone' => '0707000092'],
            ['name' => 'Kra Sylvain', 'trade' => 'Peintre', 'phone' => '0707000093'],
            ['name' => 'Tie Adolphe', 'trade' => 'Plombier', 'phone' => '0707000094'],
        ],
        'CH-DLM-2025-005' => [
            ['name' => 'Brou Edmond', 'trade' => 'Chef d\'équipe', 'phone' => '0707000100'],
            ['name' => 'Ahizi Marcel', 'trade' => 'Maçon', 'phone' => '0707000101'],
            ['name' => 'Kpata Justin', 'trade' => 'Coffreur', 'phone' => '0707000102'],
            ['name' => 'Gnago Théodore', 'trade' => 'Ferrailleur', 'phone' => '0707000103'],
            ['name' => 'Zadi Emmanuel', 'trade' => 'Manœuvre', 'phone' => '0707000104'],
            ['name' => 'Koffi Sylvain', 'trade' => 'Manœuvre', 'phone' => '0707000105'],
        ],
        'CH-GHO-2025-006' => [
            ['name' => 'Koffi Maxime', 'trade' => 'Chef d\'équipe VRD', 'phone' => '0707000110'],
            ['name' => 'Yao Clément', 'trade' => 'Chef d\'équipe gros œuvre', 'phone' => '0707000111'],
            ['name' => 'Eboué Thierry', 'trade' => 'Maçon', 'phone' => '0707000112'],
            ['name' => 'Assi Gilles', 'trade' => 'Ferrailleur', 'phone' => '0707000113'],
            ['name' => 'N\'Cho Robert', 'trade' => 'Coffreur', 'phone' => '0707000114'],
            ['name' => 'Ebah Félix', 'trade' => 'Carreleur', 'phone' => '0707000115'],
            ['name' => 'Tuo Adama', 'trade' => 'Électricien', 'phone' => '0707000116'],
            ['name' => 'Ouattara Fanta', 'trade' => 'Plombier', 'phone' => '0707000117'],
            ['name' => 'Coulibaly Awa', 'trade' => 'Peintre', 'phone' => '0707000118'],
            ['name' => 'Bamba Ibrahima', 'trade' => 'Manœuvre', 'phone' => '0707000119'],
            ['name' => 'Kaboré Mamadou', 'trade' => 'Manœuvre', 'phone' => '0707000120'],
            ['name' => 'Sawadogo Ali', 'trade' => 'Manœuvre', 'phone' => '0707000121'],
        ],
        'CH-KOR-2025-007' => [
            ['name' => 'Silué Navigué', 'trade' => 'Maçon', 'phone' => '0707000130'],
            ['name' => 'Coulibaly Lanciné', 'trade' => 'Ferrailleur', 'phone' => '0707000131'],
            ['name' => 'Ouattara Karim', 'trade' => 'Plombier', 'phone' => '0707000132'],
            ['name' => 'Sangaré Oumar', 'trade' => 'Manœuvre', 'phone' => '0707000133'],
        ],
        'CH-ABJ-2025-008' => [
            ['name' => 'Koné Brahima', 'trade' => 'Maçon', 'phone' => '0707000140'],
            ['name' => 'Bamba Lacina', 'trade' => 'Électricien', 'phone' => '0707000141'],
            ['name' => 'Traoré Noufou', 'trade' => 'Plombier', 'phone' => '0707000142'],
            ['name' => 'Samaké Ismail', 'trade' => 'Manœuvre', 'phone' => '0707000143'],
        ],
        'CH-SOB-2025-009' => [
            ['name' => 'Bley Mathieu', 'trade' => 'Chef d\'équipe', 'phone' => '0707000150'],
            ['name' => 'Goba Aristide', 'trade' => 'Maçon', 'phone' => '0707000151'],
            ['name' => 'Dégni Hervé', 'trade' => 'Ferrailleur', 'phone' => '0707000152'],
            ['name' => 'Kei Édouard', 'trade' => 'Coffreur', 'phone' => '0707000153'],
            ['name' => 'Baï Norbert', 'trade' => 'Manœuvre', 'phone' => '0707000154'],
        ],
        'CH-MAN-2025-010' => [
            ['name' => 'Doumbouya Fodé', 'trade' => 'Chef d\'équipe', 'phone' => '0707000160'],
            ['name' => 'Camara Ibrahima', 'trade' => 'Coffreur bancheur', 'phone' => '0707000161'],
            ['name' => 'Kourouma Mamadi', 'trade' => 'Ferrailleur', 'phone' => '0707000162'],
            ['name' => 'Traoré Bangali', 'trade' => 'Maçon', 'phone' => '0707000163'],
            ['name' => 'Konaté Siaka', 'trade' => 'Électricien', 'phone' => '0707000164'],
            ['name' => 'Bah Mamoudou', 'trade' => 'Manœuvre', 'phone' => '0707000165'],
        ],
        'CH-ABJ-2025-011' => [
            ['name' => 'Yapi Olivier', 'trade' => 'Maçon VRD', 'phone' => '0707000170'],
            ['name' => 'Kouassi Gbehi', 'trade' => 'Manœuvre', 'phone' => '0707000171'],
            ['name' => 'Brou Mathias', 'trade' => 'Manœuvre', 'phone' => '0707000172'],
        ],
        'CH-ABJ-2026-001' => [
            ['name' => 'Bello Hamza', 'trade' => 'Conducteur d\'engins', 'phone' => '0707000180'],
            ['name' => 'Tari Oumar', 'trade' => 'Terrassier', 'phone' => '0707000181'],
            ['name' => 'Coulibaly Ben', 'trade' => 'Manœuvre', 'phone' => '0707000182'],
        ],
        'CH-ABJ-2026-002' => [
            ['name' => 'Yeo Mamadou', 'trade' => 'Terrassier', 'phone' => '0707000190'],
            ['name' => 'Fané Cheick', 'trade' => 'Manœuvre', 'phone' => '0707000191'],
        ],
        'CH-GGN-2026-001' => [
            ['name' => 'Gbané Joël', 'trade' => 'Conducteur d\'engins', 'phone' => '0707000200'],
            ['name' => 'Kpéou Serge', 'trade' => 'Terrassier', 'phone' => '0707000201'],
            ['name' => 'Ouattara Ladji', 'trade' => 'Manœuvre', 'phone' => '0707000202'],
        ],
    ];

    public function run(): void
    {
        $company = Company::query()->where('slug', 'entreprise-charles')->firstOrFail();

        foreach ($this->workersByProject as $code => $workers) {
            $project = Project::query()->where('code', $code)->first();
            if (! $project) continue;

            foreach ($workers as $w) {
                ProjectWorker::query()->updateOrCreate(
                    ['project_id' => $project->id, 'phone' => $w['phone']],
                    [
                        'company_id' => $company->id,
                        'name'       => $w['name'],
                        'trade'      => $w['trade'],
                        'phone'      => $w['phone'],
                        'is_active'  => true,
                        'statut'     => 'active',
                        'date_start' => $project->start_date,
                    ]
                );
            }
        }
    }
}
