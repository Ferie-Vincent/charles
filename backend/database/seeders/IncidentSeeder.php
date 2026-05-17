<?php

namespace Database\Seeders;

use App\Models\Incident;
use App\Models\Project;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

class IncidentSeeder extends Seeder
{
    private array $incidentTemplates = [
        [
            'type'              => 'Retard',
            'severity'          => 'mineur',
            'description'       => 'Livraison ciment retardée de 3 jours – approvisionnement bloqué.',
            'location'          => 'Zone stockage matériaux',
            'corrective_action' => 'Commande de remplacement passée auprès d\'un fournisseur alternatif.',
            'status'            => 'resolu',
            'days_ago'          => 45,
        ],
        [
            'type'              => 'Accident',
            'severity'          => 'majeur',
            'description'       => 'Chute d\'ouvrier depuis un échafaudage – blessure au bras droit.',
            'location'          => 'Plancher R+1',
            'corrective_action' => 'Évacuation et prise en charge médicale. Renforcement des garde-corps. Formation sécurité relancée.',
            'status'            => 'resolu',
            'days_ago'          => 60,
        ],
        [
            'type'              => 'Panne',
            'severity'          => 'mineur',
            'description'       => 'Bétonnière tombée en panne – production interrompue 4 heures.',
            'location'          => 'Zone malaxage',
            'corrective_action' => 'Remplacement de la courroie et vérification moteur. Reprise nominale le lendemain.',
            'status'            => 'resolu',
            'days_ago'          => 30,
        ],
        [
            'type'              => 'Rupture stock',
            'severity'          => 'mineur',
            'description'       => 'Rupture de stock de fers HA16 – arrêt ferraillage pendant 48h.',
            'location'          => 'Aire de ferraillage',
            'corrective_action' => 'Commande express SOTACI. Livraison obtenue en 48h.',
            'status'            => 'resolu',
            'days_ago'          => 20,
        ],
        [
            'type'              => 'Litige',
            'severity'          => 'majeur',
            'description'       => 'Litige avec riverains sur emprise chantier – accès bloqué par manifestants.',
            'location'          => 'Entrée chantier',
            'corrective_action' => 'Médiation sous-préfectorale engagée. Périmètre revu et clôture déplacée.',
            'status'            => 'resolu',
            'days_ago'          => 75,
        ],
        [
            'type'              => 'Autre',
            'severity'          => 'critique',
            'description'       => 'Inondation base vie suite pluies exceptionnelles – matériaux endommagés.',
            'location'          => 'Base vie chantier',
            'corrective_action' => 'Pompage d\'urgence, surélévation du stockage. Plan de drainage révisé.',
            'status'            => 'resolu',
            'days_ago'          => 90,
        ],
        [
            'type'              => 'Retard',
            'severity'          => 'mineur',
            'description'       => 'Retard exécution maçonnerie – rendement inférieur aux prévisions.',
            'location'          => 'Corps bâtiment principal',
            'corrective_action' => 'Renforcement équipe avec 3 maçons supplémentaires.',
            'status'            => 'en_cours',
            'days_ago'          => 10,
        ],
        [
            'type'              => 'Accident',
            'severity'          => 'mineur',
            'description'       => 'Brûlure légère à la main lors de soudure – ouvrier sans gant.',
            'location'          => 'Poste soudure ferraillage',
            'corrective_action' => 'Soins sur place. Rappel port EPI obligatoire. Signalement DRSST.',
            'status'            => 'resolu',
            'days_ago'          => 25,
        ],
    ];

    public function run(): void
    {
        $reporter = User::query()->whereHas('role', fn ($q) => $q->where('name', 'chef-chantier'))->first();
        $fallback = User::query()->whereHas('role', fn ($q) => $q->where('name', 'direction'))->firstOrFail();
        $reporter ??= $fallback;

        $projects = Project::query()->where('status', 'active')->get();

        // Distribute incidents: 2-4 per major project, 1 for minor
        $tplCount = count($this->incidentTemplates);
        $idx      = 0;

        foreach ($projects as $project) {
            $progress = $project->current_progress;
            // More incidents on older/more advanced projects
            $count = match (true) {
                $progress >= 60 => 3,
                $progress >= 30 => 2,
                default         => 1,
            };

            for ($i = 0; $i < $count; $i++) {
                $tpl       = $this->incidentTemplates[$idx % $tplCount];
                $occurredAt = Carbon::today()->subDays($tpl['days_ago'] + $i * 7);
                $resolvedAt = ($tpl['status'] === 'resolu') ? $occurredAt->copy()->addDays(3) : null;

                Incident::query()->firstOrCreate(
                    [
                        'project_id'  => $project->id,
                        'type'        => $tpl['type'],
                        'occurred_at' => $occurredAt,
                    ],
                    [
                        'reported_by'      => $reporter->id,
                        'severity'         => $tpl['severity'],
                        'description'      => $tpl['description'],
                        'location'         => $tpl['location'],
                        'corrective_action'=> $tpl['corrective_action'],
                        'witnesses'        => 'Équipe présente sur site',
                        'status'           => $tpl['status'],
                        'occurred_at'      => $occurredAt,
                        'resolved_at'      => $resolvedAt,
                    ]
                );
                $idx++;
            }
        }
    }
}
