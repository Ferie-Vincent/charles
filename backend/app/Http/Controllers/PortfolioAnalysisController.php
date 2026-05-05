<?php

namespace App\Http\Controllers;

use App\Models\Project;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class PortfolioAnalysisController extends Controller
{
    public function generate(Request $request): JsonResponse
    {
        abort_unless(
            in_array($request->user()->role->name, ['direction', 'directeur-technique']),
            403,
            'Analyse IA réservée à la direction.'
        );

        $user    = $request->user();
        $groqKey = config('services.groq.key');
        $anthropicKey = config('services.anthropic.key');

        if (! $groqKey && ! $anthropicKey) {
            return response()->json(['error' => 'Aucune clé IA configurée.'], 503);
        }

        $projects = Project::with(['incidents', 'dailyLogs', 'budgetEntries', 'dqeVersions'])
            ->where('company_id', $user->company_id)
            ->whereIn('status', ['active', 'draft'])
            ->get();

        if ($projects->isEmpty()) {
            return response()->json(['error' => 'Aucun chantier actif à analyser.'], 422);
        }

        $prompt = $this->buildPrompt($projects, $user->company->name ?? 'Entreprise');

        $result = $groqKey
            ? $this->callGroq($groqKey, $prompt)
            : $this->callAnthropic($anthropicKey, $prompt);

        if (isset($result['error'])) {
            return response()->json(['error' => $result['error']], 502);
        }

        return response()->json([
            'analysis'       => $result['text'],
            'projects_count' => $projects->count(),
            'generated_at'   => now()->toIso8601String(),
        ]);
    }

    private function buildPrompt($projects, string $companyName): string
    {
        $today      = now()->format('d/m/Y');
        $totalCount = $projects->count();

        $lines = '';
        foreach ($projects as $p) {
            $daysElapsed   = $p->start_date ? now()->diffInDays($p->start_date) : 0;
            $daysRemaining = $p->end_date ? now()->diffInDays($p->end_date, false) : null;
            $delayStatus   = $daysRemaining !== null
                ? ($daysRemaining < 0 ? abs((int)$daysRemaining).' j de retard' : (int)$daysRemaining.' j restants')
                : 'délai non défini';

            $progress    = $p->progress_percent ?? 0;
            $logCount    = $p->dailyLogs->count();
            $openIncidents = $p->incidents->where('status', 'ouvert')->count();
            $budgetTotal = $p->budgetEntries->sum('amount');
            $dqeTotal    = (float) ($p->dqeVersions->where('status', 'validated')->sortByDesc('version_number')->first()?->total_ht ?? 0);
            $budgetRatio = $dqeTotal > 0 ? round($budgetTotal / $dqeTotal * 100, 1) : 0;

            $regularity  = $daysElapsed > 0
                ? min(100, round($logCount / max(1, $daysElapsed / 7) * 100))
                : 0;

            $lines .= <<<ROW

### {$p->name} ({$p->code})
- Statut : {$p->status} | Localisation : {$p->location}
- Avancement réel : {$progress}% | Délai : {$delayStatus}
- Journaux saisis : {$logCount} | Régularité terrain : {$regularity}%
- Incidents ouverts : {$openIncidents}
- Engagements budgétaires : {$budgetTotal} FCFA / Marché DQE validé : {$dqeTotal} FCFA ({$budgetRatio}% engagé)

ROW;
        }

        return <<<PROMPT
Tu es un directeur de travaux senior spécialisé en BTP en Côte d'Ivoire. Tu analyses le portefeuille de chantiers actifs de **{$companyName}** à la date du {$today}.

## Données du portefeuille ({$totalCount} chantier(s) actif(s))

{$lines}

## Ta mission

Génère une **analyse de portefeuille exécutive** en Markdown structuré avec :

1. **Synthèse globale** — état général du portefeuille en 2-3 phrases percutantes
2. **Chantiers en alerte** 🔴 — liste les chantiers nécessitant une intervention immédiate avec la raison précise
3. **Chantiers à surveiller** 🟠 — risques potentiels à anticiper
4. **Points positifs** 🟢 — ce qui va bien dans le portefeuille
5. **Actions prioritaires cette semaine** — 3 à 5 recommandations concrètes et actionnables, chacune assignée à un rôle (Direction, Conducteur de travaux, Chef de chantier)
6. **Indicateur de santé global** — score /100 avec justification en une ligne

Style : direct, concis, professionnel. Parle comme un expert qui connaît le terrain. Pas de généralités — des constats précis basés sur les chiffres fournis. Maximum 400 mots.
PROMPT;
    }

    public function solutions(Request $request): JsonResponse
    {
        $request->validate(['analysis' => 'required|string|max:5000']);

        $groqKey      = config('services.groq.key');
        $anthropicKey = config('services.anthropic.key');

        if (! $groqKey && ! $anthropicKey) {
            return response()->json(['error' => 'Aucune clé IA configurée.'], 503);
        }

        $roles  = 'Direction, Directeur Technique, Conducteur de Travaux, Chef de Chantier, Métreur-Économiste, Comptable';
        $prompt = <<<PROMPT
Tu es un directeur de travaux senior BTP. À partir du diagnostic de portefeuille ci-dessous, génère un plan d'action structuré.

## Diagnostic
{$request->analysis}

## Instructions
Génère exactement 5 à 7 actions concrètes et actionnables. Réponds UNIQUEMENT en JSON valide, sans texte avant ou après.

Format attendu :
{
  "actions": [
    {
      "title": "Titre court de l'action (max 80 car.)",
      "detail": "Description précise de ce qu'il faut faire et pourquoi (max 200 car.)",
      "priority": "urgent|high|normal",
      "role_target": "Un rôle parmi : {$roles}",
      "project_code": "Code chantier concerné ou null si global"
    }
  ]
}

Règles : priority=urgent si délai < 48h ou risque sécurité, high si semaine, normal sinon. Sois précis et concis.
PROMPT;

        $result = $groqKey
            ? $this->callGroq($groqKey, $prompt)
            : $this->callAnthropic($anthropicKey, $prompt);

        if (isset($result['error'])) {
            return response()->json(['error' => $result['error']], 502);
        }

        $text = trim($result['text']);
        // strip markdown code fences if model wraps JSON
        $text = preg_replace('/^```(?:json)?\s*/i', '', $text);
        $text = preg_replace('/\s*```$/', '', $text);

        $decoded = json_decode($text, true);
        if (! $decoded || ! isset($decoded['actions'])) {
            return response()->json(['error' => 'Réponse IA invalide. Réessayez.'], 502);
        }

        return response()->json(['actions' => $decoded['actions']]);
    }

    private function callGroq(string $key, string $prompt): array
    {
        $response = Http::timeout(45)
            ->withToken($key)
            ->post('https://api.groq.com/openai/v1/chat/completions', [
                'model'      => 'llama-3.1-8b-instant',
                'max_tokens' => 1200,
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
                'max_tokens' => 1200,
                'messages'   => [['role' => 'user', 'content' => $prompt]],
            ]);

        if ($response->failed()) {
            return ['error' => $response->json('error.message') ?? 'Anthropic API error'];
        }

        return ['text' => $response->json('content.0.text') ?? ''];
    }
}
