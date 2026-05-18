<?php

namespace App\Http\Controllers;

use App\Models\ProjectSnapshot;
use App\Services\GroqService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AiBriefingController extends Controller
{
    public function __construct(private readonly GroqService $ai) {}

    public function briefing(Request $request): JsonResponse
    {
        $user      = $request->user();
        $companyId = $user->company_id;
        $today     = today()->toDateString();
        $yesterday = today()->subDay()->toDateString();

        // Utiliser le snapshot d'aujourd'hui s'il existe, sinon celui d'hier
        $snapshots = ProjectSnapshot::where('company_id', $companyId)
            ->where('snapshot_date', $today)
            ->get();

        if ($snapshots->isEmpty()) {
            $snapshots = ProjectSnapshot::where('company_id', $companyId)
                ->where('snapshot_date', $yesterday)
                ->get();
        }

        if ($snapshots->isEmpty()) {
            // Lazy-init : génère les snapshots à la demande si le scheduler n'a pas encore tourné
            \Artisan::call('ai:build-snapshots');
            $snapshots = ProjectSnapshot::where('company_id', $companyId)
                ->where('snapshot_date', $today)
                ->get();
        }

        if ($snapshots->isEmpty()) {
            return response()->json([
                'text'       => null,
                'sources'    => [],
                'model'      => null,
                'data_date'  => null,
                'sufficient' => false,
                'message'    => 'Données insuffisantes — aucun journal de chantier saisi.',
            ]);
        }

        $dataDate = $snapshots->first()->snapshot_date->toDateString();
        $prompt   = $this->buildBriefingPrompt($snapshots->toArray(), $dataDate);

        $result = $this->ai->analyze($prompt, 800);

        if (isset($result['error'])) {
            return response()->json(['error' => $result['error']], 503);
        }

        $sources = $this->extractSources($snapshots);

        return response()->json([
            'text'       => $result['text'],
            'sources'    => $sources,
            'model'      => 'mistral-small-latest',
            'data_date'  => $dataDate,
            'sufficient' => true,
        ]);
    }

    private function buildBriefingPrompt(array $snapshots, string $date): string
    {
        $count   = count($snapshots);
        $lines   = [];

        foreach ($snapshots as $s) {
            $retard = $s['theoretical_progress'] - $s['progress_percent'];
            $budgetPct = $s['budget_consumption_pct'];
            $lines[] = "- {$s['project_name']}: avancement {$s['progress_percent']}% (théorique {$s['theoretical_progress']}%), "
                . "retard " . ($retard > 0 ? "+{$retard}pts" : "OK") . ", "
                . "budget consommé {$budgetPct}%, "
                . "incidents critiques: {$s['incidents_critiques']}, "
                . "journaux 7j: {$s['logs_last_7_days']}, "
                . "BDC en attente: {$s['bdc_pending']}, "
                . "alertes stocks: {$s['stock_alerts']}";
        }

        $projectList = implode("\n", $lines);

        return <<<PROMPT
Tu es un assistant de chantier BTP en Côte d'Ivoire. Génère un briefing matinal concis (max 5 phrases) pour le directeur.

Données du {$date} — {$count} chantier(s) actif(s) :
{$projectList}

Règles :
- Priorité aux alertes critiques (retards > 10%, budget > 80%, incidents critiques)
- Cite les noms de chantiers concernés
- Langage professionnel, direct
- Si tout va bien, dis-le en 1 phrase
- Termine par 1 action recommandée aujourd'hui
PROMPT;
    }

    private function extractSources(mixed $snapshots): array
    {
        return $snapshots->map(fn($s) => [
            'label' => $s->project_name,
            'data'  => "Snapshot du {$s->snapshot_date->toDateString()} — avancement {$s->progress_percent}%, santé {$s->health_score}/100",
        ])->values()->toArray();
    }

    public function materialSuggestions(Request $request, int $projectId): JsonResponse
    {
        $this->authorize('view', \App\Models\Project::findOrFail($projectId));

        $snapshot = ProjectSnapshot::where('project_id', $projectId)
            ->orderByDesc('snapshot_date')
            ->first();

        $topMaterials = $snapshot?->top_materials ?? [];

        if (empty($topMaterials)) {
            // Repli : interroger directement les journaux de chantier
            $logs = \App\Models\DailyLog::where('project_id', $projectId)
                ->whereNotNull('materials_received')
                ->orderByDesc('log_date')
                ->limit(30)
                ->get();

            $freq = [];
            foreach ($logs as $log) {
                $mats = is_array($log->materials_received) ? $log->materials_received : json_decode($log->materials_received, true) ?? [];
                foreach ($mats as $m) {
                    $name = $m['name'] ?? ($m['material'] ?? null);
                    if ($name) $freq[$name] = ($freq[$name] ?? 0) + 1;
                }
            }
            arsort($freq);
            $topMaterials = array_keys(array_slice($freq, 0, 5, true));
        }

        return response()->json(['suggestions' => $topMaterials]);
    }
}
