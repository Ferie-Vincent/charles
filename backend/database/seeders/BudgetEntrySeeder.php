<?php

namespace Database\Seeders;

use App\Models\BudgetEntry;
use App\Models\Project;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

class BudgetEntrySeeder extends Seeder
{
    // Distribution prévisionnel par catégorie (% du budget)
    private array $previsionnel = [
        'Main d\'œuvre'  => 0.25,
        'Matériaux'      => 0.35,
        'Transport'      => 0.08,
        'Équipements'    => 0.12,
        'Sous-traitance' => 0.12,
        'Installation'   => 0.08,
    ];

    public function run(): void
    {
        $director   = User::query()->whereHas('role', fn ($q) => $q->where('name', 'direction'))->firstOrFail();
        $comptable  = User::query()->whereHas('role', fn ($q) => $q->where('name', 'comptable'))->first() ?? $director;

        $projects = Project::query()->where('status', 'active')->get();

        foreach ($projects as $project) {
            $budget = $project->budget_amount;
            if ($budget <= 0) continue;

            $progress   = $project->current_progress / 100;
            $startDate  = Carbon::parse($project->start_date);

            // ── Prévisionnel (1 ligne par catégorie) ─────────────────────
            foreach ($this->previsionnel as $category => $ratio) {
                $amount = round($budget * $ratio);
                BudgetEntry::query()->updateOrCreate(
                    ['project_id' => $project->id, 'type' => 'previsionnel', 'category' => $category],
                    [
                        'created_by' => $director->id,
                        'label'      => 'Budget initial – ' . $category,
                        'amount'     => $amount,
                        'entry_date' => $startDate->toDateString(),
                    ]
                );
            }

            // ── Engagements (répartis sur la durée écoulée, 3 lots) ──────
            $engagementTotal = round($budget * $progress * 0.90);
            if ($engagementTotal > 0) {
                $lots = [
                    ['label' => 'Engagement – Lot 1 (gros œuvre)', 'category' => 'Matériaux',      'pct' => 0.45],
                    ['label' => 'Engagement – Lot 2 (main d\'œuvre)', 'category' => 'Main d\'œuvre', 'pct' => 0.35],
                    ['label' => 'Engagement – Lot 3 (équipements)', 'category' => 'Équipements',    'pct' => 0.20],
                ];
                foreach ($lots as $idx => $lot) {
                    $amount    = round($engagementTotal * $lot['pct']);
                    $entryDate = $startDate->copy()->addMonths($idx + 1)->toDateString();
                    BudgetEntry::query()->updateOrCreate(
                        ['project_id' => $project->id, 'type' => 'engagement', 'label' => $lot['label']],
                        [
                            'created_by' => $director->id,
                            'category'   => $lot['category'],
                            'amount'     => $amount,
                            'entry_date' => $entryDate,
                        ]
                    );
                }
            }

            // ── Paiements (60-70% des engagements payés) ─────────────────
            $paidProgress = max(0, $progress - 0.15);
            $paiementTotal = round($budget * $paidProgress * 0.80);
            if ($paiementTotal > 0) {
                $payLots = [
                    ['label' => 'Paiement – Situation n°1', 'category' => 'Matériaux',      'pct' => 0.50],
                    ['label' => 'Paiement – Situation n°2', 'category' => 'Main d\'œuvre',   'pct' => 0.50],
                ];
                foreach ($payLots as $idx => $lot) {
                    $amount    = round($paiementTotal * $lot['pct']);
                    $entryDate = $startDate->copy()->addMonths($idx + 2)->toDateString();
                    BudgetEntry::query()->updateOrCreate(
                        ['project_id' => $project->id, 'type' => 'paiement', 'label' => $lot['label']],
                        [
                            'created_by' => $comptable->id,
                            'category'   => $lot['category'],
                            'amount'     => $amount,
                            'entry_date' => $entryDate,
                        ]
                    );
                }
            }
        }
    }
}
