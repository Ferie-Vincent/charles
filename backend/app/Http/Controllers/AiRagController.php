<?php

namespace App\Http\Controllers;

use App\Models\BudgetEntry;
use App\Models\GedDocument;
use App\Models\DailyLog;
use App\Models\Project;
use App\Models\ProjectSnapshot;
use App\Models\Incident;
use App\Models\PurchaseOrder;
use App\Services\GroqService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AiRagController extends Controller
{
    public function __construct(private readonly GroqService $ai) {}

    public function query(Request $request): JsonResponse
    {
        $data = $request->validate([
            'question'   => ['required', 'string', 'max:500'],
            'project_id' => ['nullable', 'exists:projects,id'],
        ]);

        $question  = $data['question'];
        $projectId = $data['project_id'] ?? null;
        $companyId = $request->user()->company_id;

        $context = '';
        $sources = [];

        // 1. Latest snapshots
        $snapshots = ProjectSnapshot::where('company_id', $companyId)
            ->when($projectId, fn($q) => $q->where('project_id', $projectId))
            ->orderByDesc('snapshot_date')
            ->limit(5)
            ->get();

        if ($snapshots->isNotEmpty()) {
            $context .= "=== DONNÉES CHANTIERS ===\n"
                . $snapshots->map(fn($s) =>
                    "« {$s->project_name} » ({$s->snapshot_date->toDateString()}) : "
                    . "avancement {$s->progress_percent}%, santé {$s->health_score}/100, "
                    . "budget {$s->budget_consumption_pct}%, incidents critiques: {$s->incidents_critiques}"
                )->join("\n") . "\n\n";
            $sources[] = ['label' => 'Snapshots projets', 'data' => "Données du {$snapshots->first()->snapshot_date->toDateString()}"];
        }

        // 2. GED documents metadata (keyword search)
        $keywords = $this->extractKeywords($question);
        $gedQuery = GedDocument::where('company_id', $companyId)
            ->when($projectId, fn($q) => $q->where('project_id', $projectId));
        if (!empty($keywords)) {
            $gedQuery->where(function ($q) use ($keywords) {
                foreach ($keywords as $kw) {
                    $q->orWhere('name', 'LIKE', "%{$kw}%")
                      ->orWhere('original_name', 'LIKE', "%{$kw}%");
                }
            });
        }
        $docs = $gedQuery->limit(10)->get();

        if ($docs->isNotEmpty()) {
            $context .= "=== DOCUMENTS GED PERTINENTS ===\n"
                . $docs->map(fn($d) => "- {$d->original_name} (type: {$d->type})")->join("\n")
                . "\n\n";
            $sources[] = ['label' => 'GED', 'data' => "{$docs->count()} document(s)"];
        }

        // 3. Recent daily logs — structured fields (no free text required)
        $logs = DailyLog::whereHas('project', fn($q) => $q->where('company_id', $companyId))
            ->when($projectId, fn($q) => $q->where('project_id', $projectId))
            ->where('log_date', '>=', now()->subDays(30)->toDateString())
            ->orderByDesc('log_date')
            ->limit(15)
            ->get();

        if ($logs->isNotEmpty()) {
            $context .= "=== JOURNAUX TERRAIN (30 derniers jours) ===\n"
                . $logs->map(function ($l) {
                    $mats = collect(is_array($l->materials_received) ? $l->materials_received : json_decode($l->materials_received ?? '[]', true) ?? [])
                        ->pluck('name')->filter()->implode(', ');
                    $line = "[{$l->log_date}] météo:{$l->weather}, effectif:{$l->workers_count}, avancement:{$l->progress_percent}%";
                    if ($l->has_incident) $line .= ", incident:{$l->incident_type}";
                    if ($mats) $line .= ", matériaux:{$mats}";
                    if ($l->notes) $line .= ", note:{$l->notes}";
                    return $line;
                })->join("\n")
                . "\n\n";
            $sources[] = ['label' => 'Journaux terrain', 'data' => "{$logs->count()} journal(aux) sur 30j"];
        }

        // 4. Recent incidents (60 days)
        $incidents = Incident::whereHas('project', fn($q) => $q->where('company_id', $companyId))
            ->when($projectId, fn($q) => $q->where('project_id', $projectId))
            ->where('occurred_at', '>=', now()->subDays(60)->toDateString())
            ->orderByDesc('occurred_at')
            ->limit(5)
            ->get();

        if ($incidents->isNotEmpty()) {
            $context .= "=== INCIDENTS RÉCENTS ===\n"
                . $incidents->map(fn($i) => "[{$i->occurred_at}] {$i->type} sévérité:{$i->severity} — {$i->description}")->join("\n")
                . "\n\n";
            $sources[] = ['label' => 'Incidents', 'data' => "{$incidents->count()} incident(s)"];
        }

        // 5. Budget entries summary
        $budgetQuery = BudgetEntry::whereHas('project', fn($q) => $q->where('company_id', $companyId))
            ->when($projectId, fn($q) => $q->where('project_id', $projectId));
        $budgetPrev = (clone $budgetQuery)->where('type', 'previsionnel')->sum('amount');
        $budgetReal = (clone $budgetQuery)->where('type', 'paiement')->sum('amount');
        if ($budgetPrev > 0 || $budgetReal > 0) {
            $pct = $budgetPrev > 0 ? round(($budgetReal / $budgetPrev) * 100, 1) : 0;
            $context .= "=== BUDGET ===\n"
                . "Prévisionnel: " . number_format($budgetPrev, 0, ',', ' ') . " XOF, "
                . "Réalisé: " . number_format($budgetReal, 0, ',', ' ') . " XOF ({$pct}% consommé)\n\n";
            $sources[] = ['label' => 'Budget', 'data' => "{$pct}% du budget consommé"];
        }

        // 6. BDC pending
        $bdcPending = PurchaseOrder::whereHas('project', fn($q) => $q->where('company_id', $companyId))
            ->when($projectId, fn($q) => $q->where('project_id', $projectId))
            ->where('status', 'pending')
            ->count();
        if ($bdcPending > 0) {
            $context .= "=== ACHATS ===\n{$bdcPending} bon(s) de commande en attente d'approbation.\n\n";
            $sources[] = ['label' => 'BDC', 'data' => "{$bdcPending} en attente"];
        }

        // 7. Project list (when no project_id filter — gives AI a map of all projects)
        if (!$projectId) {
            $projects = Project::where('company_id', $companyId)->select('name', 'code', 'status', 'start_date', 'end_date')->get();
            if ($projects->isNotEmpty()) {
                $context .= "=== PORTEFEUILLE CHANTIERS ===\n"
                    . $projects->map(fn($p) => "- {$p->name} ({$p->code}) statut:{$p->status} du {$p->start_date} au {$p->end_date}")->join("\n")
                    . "\n\n";
                $sources[] = ['label' => 'Portefeuille', 'data' => "{$projects->count()} chantier(s)"];
            }
        }

        if (empty(trim($context))) {
            return response()->json([
                'answer'     => null,
                'sources'    => [],
                'sufficient' => false,
                'message'    => 'Données insuffisantes. Commencez par saisir des journaux de chantier.',
            ]);
        }

        $result = $this->ai->analyze(
            "Tu es un assistant expert BTP en Côte d'Ivoire. Réponds à la question suivante en t'appuyant UNIQUEMENT sur les données fournies. "
            . "Si la réponse n'est pas dans les données, dis-le clairement. Cite les sources utilisées. Réponse concise (max 4 phrases).\n\n"
            . "CONTEXTE :\n{$context}\nQUESTION : {$question}",
            600
        );

        if (isset($result['error'])) {
            return response()->json(['error' => $result['error']], 503);
        }

        return response()->json([
            'answer'     => $result['text'],
            'sources'    => $sources,
            'model'      => 'mistral-small-latest',
            'sufficient' => true,
        ]);
    }

    private function extractKeywords(string $question): array
    {
        $stopWords = ['quel', 'quels', 'quelle', 'quelles', 'est', 'sont', 'les', 'des', 'dans', 'pour', 'avec', 'sur', 'que', 'qui', 'comment', 'combien'];
        $words = preg_split('/\s+/', strtolower($question));
        return array_values(array_filter($words, fn($w) =>
            mb_strlen($w) > 4 && !in_array($w, $stopWords)
        ));
    }
}
