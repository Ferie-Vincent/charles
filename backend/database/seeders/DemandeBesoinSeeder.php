<?php

namespace Database\Seeders;

use App\Models\Company;
use App\Models\DemandeBesoin;
use App\Models\Project;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

class DemandeBesoinSeeder extends Seeder
{
    private array $templates = [
        ['title' => 'Ciment CPA – approvisionnement urgent',     'category' => 'materiaux',   'qty' => 200, 'unit' => 'sac',    'cost' => 2_500_000, 'urgency' => 'urgent',    'status' => 'livre'],
        ['title' => 'Rond à béton HA16 – lot ferraillage R+2',   'category' => 'materiaux',   'qty' => 5,   'unit' => 'tonne',  'cost' => 2_750_000, 'urgency' => 'urgent',    'status' => 'livre'],
        ['title' => 'Bétonnière de remplacement (panne en cours)', 'category' => 'equipement', 'qty' => 1,  'unit' => 'u',      'cost' => 1_200_000, 'urgency' => 'critique', 'status' => 'en_preparation'],
        ['title' => 'EPI – casques et gants ouvriers',           'category' => 'materiaux',   'qty' => 30,  'unit' => 'lot',    'cost' => 450_000,   'urgency' => 'normal',  'status' => 'livre'],
        ['title' => 'Carrelage grès cérame 60×60 – RDC',        'category' => 'materiaux',   'qty' => 120, 'unit' => 'm²',     'cost' => 1_800_000, 'urgency' => 'normal',  'status' => 'approuve'],
        ['title' => 'Câble électrique 2.5mm² – lot réseau',     'category' => 'materiaux',   'qty' => 20,  'unit' => 'rouleau','cost' => 920_000,   'urgency' => 'urgent',    'status' => 'soumis'],
        ['title' => 'Peinture acrylique extérieure – façades',  'category' => 'materiaux',   'qty' => 30,  'unit' => 'pot',    'cost' => 540_000,   'urgency' => 'normal',  'status' => 'soumis'],
        ['title' => 'Menuiserie aluminium – lot fenêtres',       'category' => 'materiaux',   'qty' => 15,  'unit' => 'u',      'cost' => 3_750_000, 'urgency' => 'urgent',    'status' => 'approuve'],
        ['title' => 'Sable et gravier – recharge stock',        'category' => 'materiaux',   'qty' => 50,  'unit' => 'm³',     'cost' => 1_750_000, 'urgency' => 'normal',  'status' => 'livre'],
        ['title' => 'Disques de tronçonnage – outillage',       'category' => 'autre',   'qty' => 5,   'unit' => 'boîte',  'cost' => 75_000,    'urgency' => 'normal',  'status' => 'livre'],
    ];

    public function run(): void
    {
        $company   = Company::query()->where('slug', 'entreprise-charles')->firstOrFail();
        $director  = User::query()->whereHas('role', fn ($q) => $q->where('name', 'direction'))->firstOrFail();
        $conducteur= User::query()->whereHas('role', fn ($q) => $q->where('name', 'conducteur-travaux'))->first() ?? $director;
        $chef      = User::query()->whereHas('role', fn ($q) => $q->where('name', 'chef-chantier'))->first() ?? $director;

        $projects = Project::query()->where('status', 'active')
            ->where('current_progress', '>', 15)
            ->get();

        $tplCount = count($this->templates);
        $idx      = 0;

        foreach ($projects as $project) {
            $progress = $project->current_progress;
            $count    = match (true) {
                $progress >= 60 => 4,
                $progress >= 30 => 3,
                default         => 2,
            };

            for ($i = 0; $i < $count; $i++) {
                $tpl    = $this->templates[$idx % $tplCount];
                $daysAgo = 10 + ($i * 20);
                $reqDate = Carbon::today()->subDays($daysAgo);

                $approvedAt  = null;
                $preparedAt  = null;
                $deliveredAt = null;
                $recordedAt  = null;

                if (in_array($tpl['status'], ['approuve', 'en_preparation', 'livre'])) {
                    $approvedAt = $reqDate->copy()->addDays(2);
                }
                if (in_array($tpl['status'], ['en_preparation', 'livre'])) {
                    $preparedAt = $reqDate->copy()->addDays(4);
                }
                if ($tpl['status'] === 'livre') {
                    $deliveredAt = $reqDate->copy()->addDays(7);
                    $recordedAt  = $reqDate->copy()->addDays(8);
                }

                DemandeBesoin::query()->updateOrCreate(
                    ['project_id' => $project->id, 'title' => $tpl['title'] . ' – ' . $project->code],
                    [
                        'company_id'     => $company->id,
                        'requested_by'   => $chef->id,
                        'title'          => $tpl['title'] . ' – ' . $project->code,
                        'description'    => $tpl['title'],
                        'category'       => $tpl['category'],
                        'quantity'       => $tpl['qty'],
                        'unit'           => $tpl['unit'],
                        'estimated_cost' => $tpl['cost'],
                        'urgency'        => $tpl['urgency'],
                        'status'         => $tpl['status'],
                        'approved_by'    => $approvedAt ? $conducteur->id : null,
                        'approved_at'    => $approvedAt,
                        'prepared_by'    => $preparedAt ? $conducteur->id : null,
                        'prepared_at'    => $preparedAt,
                        'delivered_at'   => $deliveredAt,
                        'delivered_by'   => $deliveredAt ? $conducteur->id : null,
                        'actual_cost'    => $deliveredAt ? $tpl['cost'] : null,
                        'recorded_by'    => $recordedAt ? $director->id : null,
                        'recorded_at'    => $recordedAt,
                    ]
                );
                $idx++;
            }
        }
    }
}
