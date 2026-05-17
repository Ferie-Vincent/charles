<?php

namespace App\Services;

use App\Models\Company;
use Illuminate\Support\Facades\Http;

/**
 * Client IA multi-provider avec fallback automatique.
 *
 * Ordre de priorité par défaut : Mistral → Groq → Anthropic
 * Une entreprise peut pincer son propre provider via les paramètres (DB > .env).
 *
 * Configurer dans .env :
 *   MISTRAL_API_KEY   → mistral-small-latest (recommandé, meilleur rapport qualité/coût)
 *   GROQ_API_KEY      → llama-3.1-8b-instant (ultra-rapide, gratuit jusqu'à la limite)
 *   ANTHROPIC_API_KEY → claude-haiku (fallback + analyzeImage via Pixtral)
 *
 * La vision IA (analyzeImage) nécessite obligatoirement MISTRAL_API_KEY — seul provider
 * supportant le modèle Pixtral pour l'analyse de photos de chantier.
 *
 * Retourne toujours ['text' => '...'] en succès ou ['error' => '...'] en échec.
 * Les callers doivent vérifier la clé 'error' avant d'utiliser 'text'.
 */
class GroqService
{
    private string $mistralKey;
    private string $groqKey;
    private string $anthropicKey;
    private ?string $activeProvider = null;

    public function __construct()
    {
        $this->mistralKey   = config('services.mistral.key', '');
        $this->groqKey      = config('services.groq.key', '');
        $this->anthropicKey = config('services.anthropic.key', '');
    }

    /**
     * Applique la configuration IA de l'entreprise (clé + provider choisi).
     * La config DB prime sur les clés .env — permet à chaque entreprise d'utiliser son propre compte.
     * À appeler avant analyze() dans chaque controller qui a un utilisateur authentifié.
     */
    public function applyCompanyConfig(Company $company): void
    {
        if (! $company->ai_api_key || ! $company->ai_provider) {
            return;
        }

        $key = $company->ai_api_key;
        match ($company->ai_provider) {
            'mistral'   => $this->mistralKey   = $key,
            'groq'      => $this->groqKey      = $key,
            'anthropic' => $this->anthropicKey = $key,
            default     => null,
        };
        $this->activeProvider = $company->ai_provider;
    }

    public function available(): bool
    {
        return $this->mistralKey !== '' || $this->groqKey !== '' || $this->anthropicKey !== '';
    }

    public function analyze(string $prompt, int $maxTokens = 2000): array
    {
        // Si l'entreprise a épinglé un provider spécifique, l'utiliser en premier
        if ($this->activeProvider === 'groq' && $this->groqKey) {
            return $this->callGroq($prompt, $maxTokens);
        }
        if ($this->activeProvider === 'anthropic' && $this->anthropicKey) {
            return $this->callAnthropic($prompt, $maxTokens);
        }

        if ($this->mistralKey) {
            return $this->callMistral($prompt, $maxTokens);
        }

        if ($this->groqKey) {
            return $this->callGroq($prompt, $maxTokens);
        }

        if ($this->anthropicKey) {
            return $this->callAnthropic($prompt, $maxTokens);
        }

        return ['error' => 'Aucune clé IA configurée (MISTRAL_API_KEY, GROQ_API_KEY ou ANTHROPIC_API_KEY).'];
    }

    public function analyzeImage(string $imageBase64, string $mimeType, string $prompt, int $maxTokens = 800): array
    {
        if (! $this->mistralKey) {
            return ['error' => 'MISTRAL_API_KEY requis pour la vision IA.'];
        }

        $response = Http::timeout(90)
            ->withToken($this->mistralKey)
            ->post('https://api.mistral.ai/v1/chat/completions', [
                'model'      => 'pixtral-12b-2409',
                'max_tokens' => $maxTokens,
                'messages'   => [[
                    'role'    => 'user',
                    'content' => [
                        ['type' => 'text', 'text' => $prompt],
                        ['type' => 'image_url', 'image_url' => ['url' => "data:{$mimeType};base64,{$imageBase64}"]],
                    ],
                ]],
            ]);

        if ($response->failed()) {
            return ['error' => $response->json('message') ?? 'Mistral vision API error'];
        }

        return ['text' => $response->json('choices.0.message.content') ?? ''];
    }

    private function callMistral(string $prompt, int $maxTokens): array
    {
        $response = Http::timeout(60)
            ->withToken($this->mistralKey)
            ->post('https://api.mistral.ai/v1/chat/completions', [
                'model'      => 'mistral-small-latest',
                'max_tokens' => $maxTokens,
                'messages'   => [['role' => 'user', 'content' => $prompt]],
            ]);

        if ($response->failed()) {
            return ['error' => $response->json('message') ?? 'Mistral API error'];
        }

        return ['text' => $response->json('choices.0.message.content') ?? ''];
    }

    private function callGroq(string $prompt, int $maxTokens): array
    {
        $response = Http::timeout(60)
            ->withToken($this->groqKey)
            ->post('https://api.groq.com/openai/v1/chat/completions', [
                'model'      => 'llama-3.1-8b-instant',
                'max_tokens' => $maxTokens,
                'messages'   => [['role' => 'user', 'content' => $prompt]],
            ]);

        if ($response->failed()) {
            return ['error' => $response->json('error.message') ?? 'Groq API error'];
        }

        return ['text' => $response->json('choices.0.message.content') ?? ''];
    }

    private function callAnthropic(string $prompt, int $maxTokens): array
    {
        $response = Http::timeout(60)
            ->withHeaders([
                'x-api-key'         => $this->anthropicKey,
                'anthropic-version' => '2023-06-01',
            ])
            ->post('https://api.anthropic.com/v1/messages', [
                'model'      => 'claude-haiku-4-5-20251001',
                'max_tokens' => $maxTokens,
                'messages'   => [['role' => 'user', 'content' => $prompt]],
            ]);

        if ($response->failed()) {
            return ['error' => $response->json('error.message') ?? 'Anthropic API error'];
        }

        return ['text' => $response->json('content.0.text') ?? ''];
    }
}
