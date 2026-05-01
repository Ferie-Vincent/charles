<?php

namespace App\Http\Controllers;

use App\Models\Project;
use GuzzleHttp\Client;
use GuzzleHttp\Exception\ClientException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MeetingReportController extends Controller
{
    public function generate(Request $request, Project $project): JsonResponse
    {
        $this->authorize('view', $project);

        $data = $request->validate([
            'date'            => ['required', 'date'],
            'location'        => ['nullable', 'string', 'max:200'],
            'participants'    => ['required', 'array', 'min:1', 'max:20'],
            'participants.*'  => ['required', 'string', 'max:100'],
            'agenda_items'    => ['required', 'array', 'min:1', 'max:15'],
            'agenda_items.*'  => ['required', 'string', 'max:300'],
            'decisions'       => ['nullable', 'array', 'max:15'],
            'decisions.*'     => ['required', 'string', 'max:300'],
            'action_items'    => ['nullable', 'array', 'max:15'],
            'action_items.*.task'     => ['required', 'string', 'max:300'],
            'action_items.*.owner'    => ['required', 'string', 'max:100'],
            'action_items.*.due_date' => ['nullable', 'string', 'max:50'],
        ]);

        $anthropicKey = config('services.anthropic.key');
        $groqKey      = config('services.groq.key');

        if (! $anthropicKey && ! $groqKey) {
            return response()->json(['error' => 'Aucune clé IA configurée (ANTHROPIC_API_KEY ou GROQ_API_KEY).'], 503);
        }

        $prompt = $this->buildPrompt($project, $data);

        try {
            $content = $anthropicKey
                ? $this->callAnthropic($anthropicKey, $prompt)
                : $this->callGroq($groqKey, $prompt);

            return response()->json(['report' => $content]);

        } catch (ClientException $e) {
            $msg = json_decode($e->getResponse()->getBody()->getContents(), true)['error']['message'] ?? $e->getMessage();
            return response()->json(['error' => $msg], 502);
        }
    }

    private function callAnthropic(string $key, string $prompt): string
    {
        $client   = new Client(['timeout' => 30]);
        $response = $client->post('https://api.anthropic.com/v1/messages', [
            'headers' => [
                'x-api-key'         => $key,
                'anthropic-version' => '2023-06-01',
                'content-type'      => 'application/json',
            ],
            'json' => [
                'model'      => 'claude-haiku-4-5-20251001',
                'max_tokens' => 1500,
                'messages'   => [['role' => 'user', 'content' => $prompt]],
            ],
        ]);
        $body = json_decode($response->getBody()->getContents(), true);
        return $body['content'][0]['text'] ?? '';
    }

    private function callGroq(string $key, string $prompt): string
    {
        $client   = new Client(['timeout' => 30]);
        $response = $client->post('https://api.groq.com/openai/v1/chat/completions', [
            'headers' => [
                'Authorization' => 'Bearer ' . $key,
                'content-type'  => 'application/json',
            ],
            'json' => [
                'model'      => 'llama-3.1-8b-instant',
                'max_tokens' => 1500,
                'messages'   => [['role' => 'user', 'content' => $prompt]],
            ],
        ]);
        $body = json_decode($response->getBody()->getContents(), true);
        return $body['choices'][0]['message']['content'] ?? '';
    }

    private function buildPrompt(Project $project, array $data): string
    {
        $participants = implode(', ', $data['participants']);
        $agenda       = implode("\n", array_map(fn($i, $v) => ($i + 1) . ". $v", array_keys($data['agenda_items']), $data['agenda_items']));
        $decisions    = empty($data['decisions']) ? 'Aucune décision formelle.' :
            implode("\n", array_map(fn($i, $v) => "- $v", array_keys($data['decisions']), $data['decisions']));

        $actions = 'Aucune action définie.';
        if (! empty($data['action_items'])) {
            $rows = array_map(fn($a) =>
                sprintf('- %s → %s%s', $a['task'], $a['owner'], isset($a['due_date']) ? " (échéance : {$a['due_date']})" : ''),
                $data['action_items']
            );
            $actions = implode("\n", $rows);
        }

        $location = $data['location'] ?? 'Non précisé';
        $date     = (new \DateTime($data['date']))->format('d/m/Y');

        return <<<PROMPT
Tu es un assistant spécialisé dans la rédaction de comptes-rendus de réunion de chantier BTP professionnels en français.

Génère un compte-rendu de réunion formel et structuré en Markdown à partir des informations suivantes :

**Chantier :** {$project->name} ({$project->code})
**Date :** $date
**Lieu :** $location
**Participants :** $participants

**Ordre du jour :**
$agenda

**Décisions prises :**
$decisions

**Actions à mener :**
$actions

Rédige un compte-rendu professionnel avec :
1. Un en-tête (chantier, date, lieu, participants)
2. Un résumé de chaque point de l'ordre du jour (2-3 phrases par point)
3. Un tableau récapitulatif des décisions
4. Un tableau des actions avec responsable et échéance
5. Une formule de clôture standard

Style : formel, concis, adapté au secteur BTP. Ne pas inventer d'informations non fournies.
PROMPT;
    }
}
