<?php

namespace App\Console\Commands;

use App\Models\Project;
use App\Models\SituationTravaux;
use App\Models\DailyLog;
use App\Models\DqeVersion;
use App\Services\GroqService;
use Carbon\Carbon;
use Illuminate\Console\Command;

class AiAutoSituation extends Command
{
    protected $signature = 'ai:auto-situation {--project= : ID de projet spécifique}';
    protected $description = 'Génère automatiquement la situation de travaux via Mistral pour les projets actifs (fin de mois)';

    public function __construct(private readonly GroqService $ai)
    {
        parent::__construct();
    }

    public function handle(): int
    {
        $query = Project::where('status', 'en_cours');
        if ($this->option('project')) {
            $query->where('id', $this->option('project'));
        }
        $projects = $query->get();

        $this->info("Auto-situation pour {$projects->count()} projet(s)…");

        foreach ($projects as $project) {
            $this->generateForProject($project);
        }

        $this->info('Done.');
        return self::SUCCESS;
    }

    private function generateForProject(Project $project): void
    {
        // Passer si une situation existe déjà ce mois
        $alreadyThisMonth = SituationTravaux::where('project_id', $project->id)
            ->where('periode', '>=', now()->startOfMonth()->toDateString())
            ->where('periode', '<=', now()->endOfMonth()->toDateString())
            ->exists();

        if ($alreadyThisMonth) {
            $this->line("  [skip] {$project->name} — situation déjà générée ce mois");
            return;
        }

        // Construire le contexte à partir des 30 derniers jours de journaux
        $logs = DailyLog::where('project_id', $project->id)
            ->where('log_date', '>=', now()->subDays(30)->toDateString())
            ->orderBy('log_date')
            ->get();

        if ($logs->isEmpty()) {
            $this->line("  [skip] {$project->name} — aucun journal ce mois");
            return;
        }

        // Dernière DQE validée pour le contexte
        $dqe = DqeVersion::where('project_id', $project->id)
            ->where('status', 'validated')
            ->orderByDesc('version_number')
            ->first();

        $logsText = $logs->map(fn($l) =>
            "{$l->log_date}: météo={$l->weather}, effectif={$l->workers_count}, "
            . "avancement={$l->progress_percent}%"
            . ($l->has_incident ? ", INCIDENT: {$l->incident_type}" : '')
            . ($l->notes ? ", note: {$l->notes}" : '')
        )->join("\n");

        $dqeContext = $dqe
            ? "DQE validé: {$dqe->name} — Total HT: " . number_format($dqe->total_ht, 0, ',', ' ') . " FCFA"
            : "Aucun DQE validé disponible.";

        $prompt = <<<PROMPT
Tu es un assistant BTP. Génère une situation de travaux mensuelle pour le chantier « {$project->name} »
(période : {$logs->first()->log_date} → {$logs->last()->log_date}).

{$dqeContext}

Journaux de chantier :
{$logsText}

Format de réponse :
## Récapitulatif de la période
[2-3 phrases sur l'activité générale]

## Avancement
[Pourcentage et commentaire]

## Incidents et points d'attention
[Liste ou "Aucun incident"]

## Recommandations
[1-2 actions pour la période suivante]
PROMPT;

        $result = $this->ai->analyze($prompt, 800);

        if (isset($result['error'])) {
            $this->warn("  [error] {$project->name} — {$result['error']}");
            return;
        }

        // Récupérer le dernier avancement depuis les journaux pour l'enregistrement de la situation
        $latestProgress = $logs->last()->progress_percent ?? 0;

        SituationTravaux::create([
            'project_id'     => $project->id,
            'company_id'     => $project->company_id,
            'rapport_ia'     => $result['text'],
            'avancement_pct' => $latestProgress,
            'status'         => 'brouillon',
            'notes'          => "Auto-générée par IA le " . now()->toDateString() . " — période " . now()->format('Y-m'),
            'numero'         => 'AUTO-' . now()->format('Ym'),
            'periode'        => now()->startOfMonth()->toDateString(),
            'montant_brut_ht' => 0,
            'cumul_precedent_ht' => 0,
            'retenue_garantie_pct' => 5,
            'retenue_garantie_amount' => 0,
            'avance_remboursement' => 0,
            'vat_rate' => 18,
            'vat_amount' => 0,
            'net_a_payer' => 0,
        ]);

        $this->info("  [ok] {$project->name} — situation générée");
    }
}
