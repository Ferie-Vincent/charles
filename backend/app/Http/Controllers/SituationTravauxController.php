<?php

namespace App\Http\Controllers;

use App\Models\DqeVersion;
use App\Models\GedDocument;
use App\Models\Project;
use App\Support\Roles;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class SituationTravauxController extends Controller
{
    public function generate(Request $request, Project $project): JsonResponse
    {
        $this->authorize('view', $project);

        abort_unless(in_array($request->user()->role->name, Roles::DQE_VIEWERS), 403, 'Génération de situation de travaux non autorisée pour ce rôle.');

        $data = $request->validate([
            'periode'        => ['required', 'string', 'regex:/^\d{4}-\d{2}$/'],
            'dqe_version_id' => ['nullable', 'integer', Rule::exists('dqe_versions', 'id')->where('project_id', $project->id)],
            'avancement'     => ['nullable', 'numeric', 'min:0', 'max:100'],
        ]);

        $groqKey      = config('services.groq.key');
        $anthropicKey = config('services.anthropic.key');

        if (! $groqKey && ! $anthropicKey) {
            return response()->json(['error' => 'Aucune clé IA configurée (GROQ_API_KEY ou ANTHROPIC_API_KEY).'], 503);
        }

        // Load DQE version — prefer the one requested, else latest validated
        $dqeVersion = ($data['dqe_version_id'] ?? null)
            ? DqeVersion::with('lines')->find($data['dqe_version_id'])
            : $project->dqeVersions()->with('lines')->where('status', 'validated')->latest()->first();

        if (! $dqeVersion) {
            return response()->json(['error' => 'Aucun DQE validé trouvé pour ce chantier.'], 422);
        }

        abort_if($dqeVersion->project_id !== $project->id, 403);

        abort_if(
            $dqeVersion->status !== 'validated',
            422,
            'La situation ne peut être générée qu\'à partir d\'un DQE validé (statut actuel : ' . $dqeVersion->status . ').'
        );

        // Gather project context
        $avancement      = $data['avancement'] ?? $project->progress_percent ?? 0;
        $budgetTotal     = $project->budgetEntries()->sum('amount');
        $incidentCount   = $project->incidents()->where('status', 'ouvert')->count();
        $totalLogs       = $project->dailyLogs()->count();
        $workersAvg      = round($project->dailyLogs()->avg('workers_count') ?? 0);
        $lastLog         = $project->dailyLogs()->latest('log_date')->first();
        $lastLogDate     = $lastLog ? $lastLog->log_date : 'N/A';

        $prompt = $this->buildPrompt($project, $dqeVersion, $avancement, $budgetTotal, $incidentCount, $totalLogs, $workersAvg, $lastLogDate, $data['periode']);

        $content = $groqKey
            ? $this->callGroq($groqKey, $prompt)
            : $this->callAnthropic($anthropicKey, $prompt);

        if (isset($content['error'])) {
            return response()->json(['error' => $content['error']], 502);
        }

        $gedDoc = $this->archiveToGed($project, $data['periode'], $content['text'], $request->user()->id);

        return response()->json([
            'situation'      => $content['text'],
            'dqe_version'    => $dqeVersion->name,
            'dqe_version_id' => $dqeVersion->id,
            'total_ht'       => $dqeVersion->total_ht,
            'avancement'     => $avancement,
            'ged_document_id' => $gedDoc?->id,
        ]);
    }

    private function archiveToGed(Project $project, string $periode, string $text, int $userId): ?GedDocument
    {
        try {
            $safeCode = preg_replace('/[^A-Za-z0-9\-_]/', '', $project->code);
            $filename = "situation-travaux-{$safeCode}-{$periode}.md";
            $path     = "ged/situation-travaux/{$project->id}/{$filename}";

            Storage::disk('public')->put($path, $text);

            return GedDocument::create([
                'company_id'    => $project->company_id,
                'project_id'    => $project->id,
                'uploaded_by'   => $userId,
                'name'          => "Situation Travaux – {$project->name} – {$periode}",
                'original_name' => $filename,
                'path'          => $path,
                'mime_type'     => 'text/markdown',
                'size_bytes'    => Storage::disk('public')->size($path),
                'type'          => 'rapport',
                'description'   => "Situation de travaux générée par IA – période {$periode}",
            ]);
        } catch (\Throwable $e) {
            Log::warning("SituationTravaux: archiveToGed failed for project #{$project->id}: {$e->getMessage()}");
            return null;
        }
    }

    public function versions(Project $project): JsonResponse
    {
        $this->authorize('view', $project);

        $versions = $project->dqeVersions()
            ->select('id', 'version_number', 'name', 'status', 'total_ht')
            ->orderByDesc('version_number')
            ->get();

        return response()->json($versions);
    }

    private function callGroq(string $key, string $prompt): array
    {
        $response = Http::timeout(45)
            ->withToken($key)
            ->post('https://api.groq.com/openai/v1/chat/completions', [
                'model'      => 'llama-3.1-8b-instant',
                'max_tokens' => 2500,
                'messages'   => [['role' => 'user', 'content' => $prompt]],
            ]);

        if ($response->failed()) {
            return ['error' => $response->json('error.message') ?? 'Groq API error'];
        }

        return ['text' => $response->json('choices.0.message.content') ?? ''];
    }

    private function callAnthropic(string $key, string $prompt): array
    {
        $response = Http::timeout(45)
            ->withHeaders([
                'x-api-key'         => $key,
                'anthropic-version' => '2023-06-01',
            ])
            ->post('https://api.anthropic.com/v1/messages', [
                'model'      => 'claude-haiku-4-5-20251001',
                'max_tokens' => 2500,
                'messages'   => [['role' => 'user', 'content' => $prompt]],
            ]);

        if ($response->failed()) {
            return ['error' => $response->json('error.message') ?? 'Anthropic API error'];
        }

        return ['text' => $response->json('content.0.text') ?? ''];
    }

    private function buildPrompt(
        Project    $project,
        DqeVersion $dqe,
        float      $avancement,
        float      $budgetTotal,
        int        $incidentCount,
        int        $totalLogs,
        int        $workersAvg,
        string     $lastLogDate,
        string     $periode,
    ): string {
        [$year, $month] = explode('-', $periode);
        $moisFr = [
            '01' => 'janvier', '02' => 'février', '03' => 'mars', '04' => 'avril',
            '05' => 'mai', '06' => 'juin', '07' => 'juillet', '08' => 'août',
            '09' => 'septembre', '10' => 'octobre', '11' => 'novembre', '12' => 'décembre',
        ][$month] ?? $month;

        $montantHT   = number_format($dqe->total_ht, 0, ',', ' ');
        $montantDu   = number_format($dqe->total_ht * $avancement / 100, 0, ',', ' ');
        $budgetFmt   = $budgetTotal > 0 ? number_format($budgetTotal, 0, ',', ' ') . ' FCFA' : 'non renseigné';

        // Build lots summary (group lines by lot)
        $lots = $dqe->lines->groupBy('lot');
        $lotsText = '';
        foreach ($lots as $lotName => $lines) {
            $lotTotal = $lines->sum('montant_ht');
            $lotPct   = $dqe->total_ht > 0 ? round($lotTotal / $dqe->total_ht * 100, 1) : 0;
            $lotFmt   = number_format($lotTotal, 0, ',', ' ');
            $lotsText .= "- {$lotName} : {$lotFmt} FCFA ({$lotPct}% du marché, {$lines->count()} ouvrages)\n";
        }

        $startDate = $project->start_date
            ? (new \DateTime($project->start_date))->format('d/m/Y')
            : 'non défini';
        $endDate = $project->end_date
            ? (new \DateTime($project->end_date))->format('d/m/Y')
            : 'non défini';

        return <<<PROMPT
Tu es un expert en gestion de projets BTP en Côte d'Ivoire. Rédige une **Situation de Travaux N°{$month}/{$year}** professionnelle et complète en français, en Markdown.

## Informations du chantier

**Chantier :** {$project->name} ({$project->code})
**Maître d'ouvrage :** Entreprise Charles
**Période :** {$moisFr} {$year}
**Date de début :** {$startDate}
**Date de fin prévue :** {$endDate}
**Dernier pointage terrain :** {$lastLogDate}

## Marché (DQE — {$dqe->name})

**Montant du marché HT :** {$montantHT} FCFA
**Nombre de lots :** {$lots->count()}
**Répartition par lot :**
{$lotsText}

## Avancement & activité

**Avancement global :** {$avancement}%
**Montant dû à ce stade :** {$montantDu} FCFA
**Engagements budgétaires :** {$budgetFmt}
**Jours de pointage journal :** {$totalLogs} jours
**Effectif moyen :** {$workersAvg} ouvriers/jour
**Incidents ouverts :** {$incidentCount}

## Ce que tu dois produire

Rédige une situation de travaux officielle avec :
1. **En-tête** — références du chantier, période, DQE de référence
2. **Avancement par lot** — pour chaque lot, estime le pourcentage réalisé en cohérence avec l'avancement global de {$avancement}% (répartis de façon réaliste selon la nature des travaux BTP)
3. **Tableau de décompte** — colonnes : Lot | Montant marché (FCFA) | % réalisé | Montant réalisé (FCFA)
4. **Récapitulatif financier** — montant HT réalisé, TVA 18%, montant TTC, déduction éventuelle, **NET À PAYER**
5. **Observations terrain** — commentaire sur l'avancement, les risques, les points d'attention (basé sur {$incidentCount} incident(s) ouvert(s))
6. **Certifications** — bloc signature : Conducteur de travaux | Chef de chantier | Maître d'œuvre

Style : formel, chiffré, professionnel. Utilise des tableaux Markdown. Ne pas inventer de données non fournies.
PROMPT;
    }
}
