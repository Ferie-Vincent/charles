<?php

namespace App\Http\Controllers;

use App\Support\Roles;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;

class ProfileController extends Controller
{
    public function update(Request $request): JsonResponse
    {
        $user = $request->user();

        $data = $request->validate([
            'name'  => 'required|string|max:255',
            'email' => 'required|email|max:255|unique:users,email,' . $user->id,
        ]);

        $user->update($data);
        $user->load(['company', 'role']);

        return response()->json(['user' => $user]);
    }

    public function changePassword(Request $request): JsonResponse
    {
        $request->validate([
            'current_password' => 'required|string',
            'password'         => ['required', 'confirmed', Password::min(8)],
        ]);

        if (! Hash::check($request->current_password, $request->user()->password)) {
            throw ValidationException::withMessages([
                'current_password' => ['Le mot de passe actuel est incorrect.'],
            ]);
        }

        $request->user()->update([
            'password' => Hash::make($request->password),
        ]);

        return response()->json(['message' => 'Mot de passe mis à jour.']);
    }

    public function forceChangePassword(Request $request): JsonResponse
    {
        $request->validate([
            'password' => ['required', 'confirmed', Password::min(8)],
        ]);

        $request->user()->update([
            'password'             => Hash::make($request->password),
            'must_change_password' => false,
        ]);

        return response()->json(['message' => 'Mot de passe défini.']);
    }

    public function updateCompany(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->role->name !== 'direction') {
            return response()->json(['message' => 'Réservé à la Direction.'], 403);
        }

        $data = $request->validate([
            'name' => 'required|string|max:255',
        ]);

        $user->company->update($data);

        return response()->json(['company' => $user->company->fresh()]);
    }

    public function getAiSettings(Request $request): JsonResponse
    {
        $company = $request->user()->company;
        return response()->json([
            'ai_enabled'  => (bool) $company->ai_enabled,
            'ai_provider' => $company->ai_provider,
            'has_api_key' => ! empty($company->ai_api_key),
        ]);
    }

    public function updateAiSettings(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! in_array($user->role->name, Roles::MANAGEMENT)) {
            return response()->json(['message' => 'Réservé à la Direction.'], 403);
        }

        $data = $request->validate([
            'ai_enabled'  => 'required|boolean',
            'ai_provider' => 'nullable|in:mistral,groq,anthropic',
            'ai_api_key'  => 'nullable|string|max:200',
        ]);

        $update = ['ai_enabled' => $data['ai_enabled']];

        if (array_key_exists('ai_provider', $data)) {
            $update['ai_provider'] = $data['ai_provider'];
        }

        // Empty string = clear the key; null = keep existing
        if (array_key_exists('ai_api_key', $data)) {
            $update['ai_api_key'] = $data['ai_api_key'] ?: null;
        }

        $user->company->update($update);

        return response()->json([
            'ai_enabled'  => (bool) $user->company->fresh()->ai_enabled,
            'ai_provider' => $user->company->fresh()->ai_provider,
            'has_api_key' => ! empty($user->company->fresh()->ai_api_key),
        ]);
    }

    public function testAiConnection(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! in_array($user->role->name, Roles::MANAGEMENT)) {
            return response()->json(['message' => 'Réservé à la Direction.'], 403);
        }

        $data = $request->validate([
            'provider' => 'required|in:mistral,groq,anthropic',
            'api_key'  => 'required|string',
        ]);

        $ok = match ($data['provider']) {
            'mistral'   => $this->pingMistral($data['api_key']),
            'groq'      => $this->pingGroq($data['api_key']),
            'anthropic' => $this->pingAnthropic($data['api_key']),
            default     => false,
        };

        return response()->json(['ok' => $ok]);
    }

    private function pingMistral(string $key): bool
    {
        try {
            $r = Http::timeout(10)->withToken($key)
                ->post('https://api.mistral.ai/v1/chat/completions', [
                    'model' => 'mistral-small-latest', 'max_tokens' => 1,
                    'messages' => [['role' => 'user', 'content' => 'hi']],
                ]);
            return $r->successful();
        } catch (\Throwable) { return false; }
    }

    private function pingGroq(string $key): bool
    {
        try {
            $r = Http::timeout(10)->withToken($key)
                ->post('https://api.groq.com/openai/v1/chat/completions', [
                    'model' => 'llama-3.1-8b-instant', 'max_tokens' => 1,
                    'messages' => [['role' => 'user', 'content' => 'hi']],
                ]);
            return $r->successful();
        } catch (\Throwable) { return false; }
    }

    private function pingAnthropic(string $key): bool
    {
        try {
            $r = Http::timeout(10)
                ->withHeaders(['x-api-key' => $key, 'anthropic-version' => '2023-06-01'])
                ->post('https://api.anthropic.com/v1/messages', [
                    'model' => 'claude-haiku-4-5-20251001', 'max_tokens' => 1,
                    'messages' => [['role' => 'user', 'content' => 'hi']],
                ]);
            return $r->successful();
        } catch (\Throwable) { return false; }
    }
}
