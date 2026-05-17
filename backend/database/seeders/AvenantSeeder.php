<?php

namespace Database\Seeders;

use App\Models\Avenant;
use App\Models\Company;
use App\Models\Project;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

class AvenantSeeder extends Seeder
{
    public function run(): void
    {
        $company  = Company::query()->where('slug', 'entreprise-charles')->firstOrFail();
        $director = User::query()->whereHas('role', fn ($q) => $q->where('name', 'direction'))->firstOrFail();
        $avNum    = 1;

        // Avenants sur les projets avancés (progress ≥ 40%)
        $avProjects = Project::query()
            ->where('status', 'active')
            ->where('current_progress', '>=', 40)
            ->get();

        foreach ($avProjects as $project) {
            $start  = Carbon::parse($project->start_date);
            $budget = $project->budget_amount;

            // Avenant n°1 – Révision prix matériaux (signé)
            Avenant::query()->updateOrCreate(
                ['project_id' => $project->id, 'numero' => 'AV-' . str_pad($avNum, 3, '0', STR_PAD_LEFT)],
                [
                    'company_id'    => $company->id,
                    'created_by'    => $director->id,
                    'numero'        => 'AV-' . str_pad($avNum++, 3, '0', STR_PAD_LEFT),
                    'objet'         => 'Révision prix matériaux – hausse ciment +12%',
                    'type'          => 'montant',
                    'montant_ht'    => round($budget * 0.04),
                    'status'        => 'signe',
                    'date_signature'=> $start->copy()->addMonths(3)->toDateString(),
                    'notes'         => 'Révision suite à la hausse des prix du ciment constatée en mars 2025 (circulaire CIMAF).',
                ]
            );
        }

        // Avenant n°2 – Délai sur les grands projets (soumis)
        $bigProjects = Project::query()
            ->where('status', 'active')
            ->where('budget_amount', '>', 200_000_000)
            ->where('current_progress', '>=', 30)
            ->get();

        foreach ($bigProjects as $project) {
            $start = Carbon::parse($project->start_date);

            Avenant::query()->updateOrCreate(
                ['project_id' => $project->id, 'numero' => 'AV-' . str_pad($avNum, 3, '0', STR_PAD_LEFT)],
                [
                    'company_id'                => $company->id,
                    'created_by'                => $director->id,
                    'numero'                    => 'AV-' . str_pad($avNum++, 3, '0', STR_PAD_LEFT),
                    'objet'                     => 'Prolongation délai contractuel – intempéries et OS arret',
                    'type'                      => 'montant_et_delai',
                    'montant_ht'                => round($project->budget_amount * 0.02),
                    'delai_supplementaire_jours'=> 30,
                    'status'                    => 'soumis',
                    'notes'                     => 'Demande de prorogation de délai de 30 jours suite aux arrêts dus aux intempéries.',
                ]
            );
        }

        // Avenant brouillon – sur quelques projets récents
        $newProjects = Project::query()
            ->where('status', 'active')
            ->where('current_progress', '<', 30)
            ->take(3)
            ->get();

        foreach ($newProjects as $project) {
            Avenant::query()->updateOrCreate(
                ['project_id' => $project->id, 'numero' => 'AV-' . str_pad($avNum, 3, '0', STR_PAD_LEFT)],
                [
                    'company_id' => $company->id,
                    'created_by' => $director->id,
                    'numero'     => 'AV-' . str_pad($avNum++, 3, '0', STR_PAD_LEFT),
                    'objet'      => 'Modification prestations – travaux modificatifs maître d\'ouvrage',
                    'type'       => 'montant',
                    'montant_ht' => round($project->budget_amount * 0.03),
                    'status'     => 'brouillon',
                    'notes'      => 'En cours de chiffrage par le bureau d\'études.',
                ]
            );
        }
    }
}
