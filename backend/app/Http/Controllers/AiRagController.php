<?php

namespace App\Http\Controllers;

use App\Models\GedDocument;
use App\Models\DailyLog;
use App\Models\ProjectSnapshot;
use App\Models\Incident;
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

        // 3. Recent daily log observations (last 30 days)
        $logs = DailyLog::whereHas('project', fn($q) => $q->where('company_id', $companyId))
            ->when($projectId, fn($q) => $q->where('project_id', $projectId))
            ->whereNotNull('notes')
            ->where('notes', '!=', '')
            ->where('log_date', '>=', now()->subDays(30)->toDateString())
            ->orderByDesc('log_date')
            ->limit(10)
            ->get();

        if ($logs->isNotEmpty()) {
            $context .= "=== OBSERVATIONS TERRAIN (30j) ===\n"
                . $logs->map(fn($l) => "[{$l->log_date}] {$l->notes}")->join("\n")
                . "\n\n";
            $sources[] = ['label' => 'Journaux terrain', 'data' => "{$logs->count()} observation(s)"];
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
                . $incidents->map(fn($i) => "[{$i->occurred_at}] {$i->type} — {$i->description}")->join("\n")
                . "\n\n";
            $sources[] = ['label' => 'Incidents', 'data' => "{$incidents->count()} incident(s)"];
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
