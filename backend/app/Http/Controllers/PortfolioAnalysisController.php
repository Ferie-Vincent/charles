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
            $dqeTotal    = $p->dqeVersions->where('status', 'validated')->sum('total_ht');
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
