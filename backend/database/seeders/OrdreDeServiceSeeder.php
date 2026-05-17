<?php

namespace Database\Seeders;

use App\Models\Company;
use App\Models\OrdreDeService;
use App\Models\Project;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

class OrdreDeServiceSeeder extends Seeder
{
    public function run(): void
    {
        $company  = Company::query()->where('slug', 'entreprise-charles')->firstOrFail();
        $director = User::query()->whereHas('role', fn ($q) => $q->where('name', 'direction'))->firstOrFail();
        $dt       = User::query()->whereHas('role', fn ($q) => $q->where('name', 'directeur-technique'))->first() ?? $director;

        $projects = Project::query()->where('status', 'active')->get();
        $osNum    = 1;

        foreach ($projects as $project) {
            $start = Carbon::parse($project->start_date);

            // OS de démarrage — toujours (acte de commencer les travaux)
            OrdreDeService::query()->updateOrCreate(
                ['project_id' => $project->id, 'type' => 'demarrage'],
                [
                    'company_id'      => $company->id,
                    'emis_par'        => $director->id,
                    'numero'          => 'OS-' . str_pad($osNum++, 4, '0', STR_PAD_LEFT),
                    'type'            => 'demarrage',
                    'objet'           => 'Ordre de démarrage des travaux – ' . $project->name,
                    'date_os'         => $start->toDateString(),
                    'description'     => 'Autorisation formelle de démarrage des travaux conformément au marché signé.',
                    'accuse_reception' => true,
                    'date_accuse'     => $start->copy()->addDays(2)->toDateString(),
                ]
            );

            // OS travaux supplémentaires — sur les projets avancés
            if ($project->current_progress >= 50) {
                OrdreDeService::query()->updateOrCreate(
                    ['project_id' => $project->id, 'type' => 'travaux_supplementaires'],
                    [
                        'company_id'       => $company->id,
                        'emis_par'         => $dt->id,
                        'numero'           => 'OS-' . str_pad($osNum++, 4, '0', STR_PAD_LEFT),
                        'type'             => 'travaux_supplementaires',
                        'objet'            => 'Travaux supplémentaires – extension réseaux VRD',
                        'date_os'          => $start->copy()->addMonths(3)->toDateString(),
                        'delai_impact_jours' => 15,
                        'description'      => 'Extension imprévue des réseaux d\'assainissement suite aux relevés topographiques réactualisés.',
                        'accuse_reception' => true,
                        'date_accuse'      => $start->copy()->addMonths(3)->addDays(3)->toDateString(),
                    ]
                );
            }

            // OS d'arrêt puis reprise — sur les projets qui ont eu une interruption
            if ($project->current_progress >= 40 && in_array($project->code, [
                'CH-YOP-2024-002', 'CH-GHO-2025-006', 'CH-SAN-2025-002', 'CH-MAN-2025-010',
            ])) {
                $arretDate = $start->copy()->addMonths(4);
                OrdreDeService::query()->updateOrCreate(
                    ['project_id' => $project->id, 'type' => 'arret'],
                    [
                        'company_id'         => $company->id,
                        'emis_par'           => $director->id,
                        'numero'             => 'OS-' . str_pad($osNum++, 4, '0', STR_PAD_LEFT),
                        'type'               => 'arret',
                        'objet'              => 'Arrêt temporaire des travaux – intempéries exceptionnelles',
                        'date_os'            => $arretDate->toDateString(),
                        'delai_impact_jours' => 10,
                        'description'        => 'Suspension des travaux pendant 10 jours suite aux pluies diluviennes enregistrées. Reprise conditionnée à l\'assainissement du site.',
                        'accuse_reception'   => true,
                        'date_accuse'        => $arretDate->copy()->addDay()->toDateString(),
                    ]
                );

                OrdreDeService::query()->updateOrCreate(
                    ['project_id' => $project->id, 'type' => 'reprise'],
                    [
                        'company_id'       => $company->id,
                        'emis_par'         => $director->id,
                        'numero'           => 'OS-' . str_pad($osNum++, 4, '0', STR_PAD_LEFT),
                        'type'             => 'reprise',
                        'objet'            => 'Ordre de reprise des travaux',
                        'date_os'          => $arretDate->copy()->addDays(12)->toDateString(),
                        'description'      => 'Le site est assaini et sécurisé. Reprise autorisée selon planning révisé.',
                        'accuse_reception' => true,
                        'date_accuse'      => $arretDate->copy()->addDays(13)->toDateString(),
                    ]
                );
            }
        }
    }
}
