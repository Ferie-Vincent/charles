<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;

class GroqService
{
    private string $groqKey;
    private string $anthropicKey;

    public function __construct()
    {
        $this->groqKey      = config('services.groq.key', '');
        $this->anthropicKey = config('services.anthropic.key', '');
    }

    public function available(): bool
    {
        return $this->groqKey !== '' || $this->anthropicKey !== '';
    }

    public function analyze(string $prompt, int $maxTokens = 2000): array
    {
        if ($this->groqKey) {
            return $this->callGroq($prompt, $maxTokens);
        }

        if ($this->anthropicKey) {
            return $this->callAnthropic($prompt, $maxTokens);
        }

        return ['error' => 'Aucune clé IA configurée (GROQ_API_KEY ou ANTHROPIC_API_KEY).'];
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
