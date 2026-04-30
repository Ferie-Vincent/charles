<?php

namespace Database\Seeders;

use App\Models\Project;
use App\Models\ProjectActivity;
use App\Models\User;
use Illuminate\Database\Seeder;

class ProjectActivitySeeder extends Seeder
{
    public function run(): void
    {
        $direction  = User::query()->where('email', 'direction@charles.ci')->first();
        $dt         = User::query()->where('email', 'dt@charles.ci')->first();
        $conducteur = User::query()->where('email', 'conducteur@charles.ci')->first();
        $chefAngre  = User::query()->where('email', 'chef.angre@charles.ci')->first();
        $chefYop    = User::query()->where('email', 'chef.yop@charles.ci')->first();
        $metreur    = User::query()->where('email', 'metreur@charles.ci')->first();

        $activities = [

            // ── CH-ANGRE-2024-001 (Terminé) ──────────────────────────────
            'CH-ANGRE-2024-001' => [
                ['2024-01-15', $direction,  'status_change',  'Chantier ouvert — démarrage officiel des travaux'],
                ['2024-01-15', $dt,         'member_added',   'Équipe constituée : DT, conducteur, chef de chantier, métreur'],
                ['2024-02-10', $chefAngre,  'site_visit',     'Visite de chantier — fondations en cours, béton coulé niveaux R-1'],
                ['2024-03-20', $conducteur, 'note',           'Réunion de chantier hebdomadaire : avancement 25 %, délai respecté'],
                ['2024-04-05', $metreur,    'budget_update',  'Révision DQE suite variation prix ciment (+8 %) — écart +2,1 M FCFA'],
                ['2024-05-18', $chefAngre,  'site_visit',     'Gros œuvre R+1 achevé — démarrage second œuvre prévu semaine 22'],
                ['2024-06-30', $conducteur, 'note',           'CR chantier : avancement 55 %, léger retard sur menuiseries aluminium'],
                ['2024-08-12', $chefAngre,  'site_visit',     'Carrelage et peinture intérieure en cours — équipe de 12 ouvriers'],
                ['2024-09-25', $metreur,    'budget_update',  'Décompte final provisoire établi — solde à régulariser : 1,8 M FCFA'],
                ['2024-10-28', $dt,         'note',           'Réception provisoire prononcée — 3 réserves mineures à lever sous 30 j'],
                ['2024-10-30', $direction,  'status_change',  'Chantier clôturé — statut passé à Terminé'],
            ],

            // ── CH-YOP-2024-002 (Actif) ───────────────────────────────────
            'CH-YOP-2024-002' => [
                ['2024-06-01', $direction,  'status_change',  'Chantier ouvert — ordre de service signé'],
                ['2024-06-03', $dt,         'member_added',   'Équipe projet constituée'],
                ['2024-07-14', $chefYop,    'site_visit',     'Terrassement terminé — début fondations semaine 29'],
                ['2024-09-02', $conducteur, 'note',           'CR mensuel août : avancement 18 %, pluies ont causé 6 jours d\'arrêt'],
                ['2024-10-20', $chefYop,    'site_visit',     'Niveau RDC en cours — colonnes et poutres ferraillées'],
                ['2024-12-05', $metreur,    'budget_update',  'Actualisation budget : coûts transport matériaux revus à la hausse'],
                ['2025-01-15', $chefYop,    'site_visit',     'R+1 achevé — coffrage R+2 en cours, avancement 40 %'],
                ['2025-02-28', $conducteur, 'note',           'CR mensuel : avancement 48 %, équipe renforcée (ferrailleur supplémentaire)'],
                ['2025-04-10', $chefYop,    'site_visit',     'R+3 en cours — toiture prévue fin mai'],
            ],

            // ── CH-PLAT-2025-001 (Actif) ──────────────────────────────────
            'CH-PLAT-2025-001' => [
                ['2025-01-10', $direction,  'status_change',  'Chantier ouvert — démarrage centre commercial Plateau'],
                ['2025-01-10', $direction,  'member_added',   'Équipe complète : Direction, DT, conducteur, chef, métreur'],
                ['2025-01-20', $dt,         'site_visit',     'Installation de chantier — baraquements, clôture de sécurité posée'],
                ['2025-02-05', $chefAngre,  'note',           'Démolition de l\'existant terminée — déblai en cours'],
                ['2025-03-01', $metreur,    'budget_update',  'Validation DQE v2 — budget confirmé à 1,2 Md FCFA'],
                ['2025-03-22', $conducteur, 'site_visit',     'Radier général en cours de coulage — 320 m³ de béton B25'],
                ['2025-04-15', $chefAngre,  'site_visit',     'Fondations achevées — début élévation RDC semaine 16'],
                ['2025-04-28', $conducteur, 'note',           'CR mensuel avril : avancement 12 %, délai tenu, météo favorable'],
            ],

            // ── CH-BKE-2025-001 (Actif) ───────────────────────────────────
            'CH-BKE-2025-001' => [
                ['2025-02-03', $direction,  'status_change',  'Chantier ouvert — école primaire Bouaké Nord'],
                ['2025-02-10', $conducteur, 'member_added',   'Conducteur et chef de chantier affectés'],
                ['2025-02-20', $chefYop,    'site_visit',     'Implantation et piquetage — terrain livré propre'],
                ['2025-03-15', $chefYop,    'site_visit',     'Fondations en cours — 4 classes sur 6 commencées'],
                ['2025-04-10', $conducteur, 'note',           'CR mensuel : avancement 30 %, maçonnerie élévation démarrée'],
                ['2025-04-25', $chefYop,    'site_visit',     'Murs RDC achevés — charpente métallique livraison prévue S20'],
            ],

            // ── CH-SAN-2025-002 (Actif) ───────────────────────────────────
            'CH-SAN-2025-002' => [
                ['2025-04-01', $direction,  'status_change',  'Chantier ouvert — entrepôt logistique San Pédro'],
                ['2025-04-05', $conducteur, 'member_added',   'Équipe projet affectée'],
                ['2025-04-15', $chefYop,    'site_visit',     'Terrassement zone portuaire — sol argileux, adaptation fondations'],
                ['2025-04-28', $metreur,    'budget_update',  'Surcoût fondations spéciales (+12 M FCFA) — avenant en cours'],
            ],

            // ── CH-ABO-2025-003 (Actif) ───────────────────────────────────
            'CH-ABO-2025-003' => [
                ['2025-05-05', $direction,  'status_change',  'Chantier ouvert — clinique médicale Abobo'],
                ['2025-05-07', $dt,         'member_added',   'DT, conducteur et chef affectés'],
                ['2025-05-20', $chefYop,    'site_visit',     'Démarrage travaux — installation de chantier opérationnelle'],
                ['2025-05-28', $conducteur, 'note',           'CR hebdomadaire : terrassement 60 % — bon avancement malgré pluies'],
            ],
        ];

        foreach ($activities as $code => $items) {
            $project = Project::query()->where('code', $code)->first();
            if (! $project) continue;

            foreach ($items as [$date, $user, $type, $description]) {
                ProjectActivity::query()->create([
                    'project_id'  => $project->id,
                    'user_id'     => $user?->id,
                    'type'        => $type,
                    'description' => $description,
                    'metadata'    => null,
                    'created_at'  => $date,
                    'updated_at'  => $date,
                ]);
            }
        }
    }
}
