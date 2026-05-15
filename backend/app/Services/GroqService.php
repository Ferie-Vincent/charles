<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;

class GroqService
{
    private string $mistralKey;
    private string $groqKey;
    private string $anthropicKey;

    public function __construct()
    {
        $this->mistralKey   = config('services.mistral.key', '');
        $this->groqKey      = config('services.groq.key', '');
        $this->anthropicKey = config('services.anthropic.key', '');
    }

    public function available(): bool
    {
        return $this->mistralKey !== '' || $this->groqKey !== '' || $this->anthropicKey !== '';
    }

    public function analyze(string $prompt, int $maxTokens = 2000): array
    {
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
