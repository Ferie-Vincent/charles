<?php

namespace App\Http\Controllers;

use App\Models\Avenant;
use App\Models\DqeVersion;
use App\Models\GedDocument;
use App\Models\Project;
use App\Models\SituationTravaux;
use App\Models\BudgetEntry;
use App\Models\User;
use App\Notifications\SituationPaidNotification;
use App\Notifications\SituationValidatedNotification;
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

        // Load DQE version — prefer the one requested, else highest version_number validated
        $dqeVersion = ($data['dqe_version_id'] ?? null)
            ? DqeVersion::with('lines')->find($data['dqe_version_id'])
            : $project->dqeVersions()->with('lines')->where('status', 'validated')->orderByDesc('version_number')->first();

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
        $avancement = (float) ($data['avancement']
            ?? $project->dailyLogs()->latest('log_date')->value('progress_percent')
            ?? 0);

        // Engage = BDC entries + validée invoices (canonical, not sum of all budget_entry types)
        $budgetEngage = (float) $project->budgetEntries()->where('type', 'engagement')->sum('amount')
            + (float) $project->invoices()->where('status', 'validee')->sum('amount_ht');
        $incidentCount   = $project->incidents()->where('status', 'ouvert')->count();
        $totalLogs       = $project->dailyLogs()->count();
        $workersAvg      = round($project->dailyLogs()->avg('workers_count') ?? 0);
        $lastLog         = $project->dailyLogs()->latest('log_date')->first();
        $lastLogDate     = $lastLog ? $lastLog->log_date : 'N/A';

        $prompt = $this->buildPrompt($project, $dqeVersion, $avancement, $budgetEngage, $incidentCount, $totalLogs, $workersAvg, $lastLogDate, $data['periode']);

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

    // ── Terrain-accessible: status badge only (no financial data) ────────────
    public function lastStatus(Project $project): JsonResponse
    {
        $this->authorize('view', $project);

        $last = SituationTravaux::where('project_id', $project->id)
            ->orderByDesc('created_at')
            ->select(['id', 'numero', 'status', 'periode', 'submitted_at', 'validated_at', 'paid_at'])
            ->first();

        return response()->json(['last_situation' => $last]);
    }

    // ── Preview calcul avant création (no DB write) ───────────────────────────
    public function previewCalcul(Request $request, Project $project): JsonResponse
    {
        $this->authorize('update', $project);

        $avancementPct = (float) $request->query('avancement_pct', 0);
        $dqeVersionId  = $request->query('dqe_version_id');

        ['base' => $base, 'avenants_sum' => $avenants] = $this->resolveBaseCalcul($project, $dqeVersionId);

        $montantBrut = round($base * ($avancementPct / 100), 2);

        $prevAvancement = SituationTravaux::where('project_id', $project->id)
            ->whereNotIn('status', ['brouillon'])
            ->orderByDesc('created_at')
            ->value('avancement_pct');

        return response()->json([
            'base_calcul'               => $base,
            'avenants_signes_sum'       => $avenants,
            'avancement_precedent_pct'  => $prevAvancement,
            'montant_brut_ht'           => $montantBrut,
            'avance_demarrage_montant'  => $project->avance_demarrage_montant,
            'avance_demarrage_pct'      => $project->avance_demarrage_pct,
        ]);
    }

    // ── DB-backed workflow methods ────────────────────────────────────────────

    public function list(Project $project): JsonResponse
    {
        $this->authorize('view', $project);

        $situations = SituationTravaux::where('project_id', $project->id)
            ->with('creator:id,name', 'dqeVersion:id,name,version_number')
            ->orderBy('created_at')
            ->get();

        // Enrich with sequential avancement context
        $prevAvancement = null;
        $enriched = $situations->map(function ($s) use (&$prevAvancement) {
            $arr = $s->toArray();
            $arr['avancement_precedent_pct'] = $prevAvancement;
            $arr['delta_pct'] = $prevAvancement !== null
                ? round($s->avancement_pct - $prevAvancement, 2)
                : $s->avancement_pct;

            if ($s->status !== 'brouillon') {
                $prevAvancement = $s->avancement_pct;
            }
            return $arr;
        })->sortByDesc('created_at')->values();

        return response()->json(['situations' => $enriched]);
    }

    public function storeSituation(Request $request, Project $project): JsonResponse
    {
        $this->authorize('update', $project);

        $data = $request->validate([
            'periode'        => ['required', 'string', 'regex:/^\d{4}-\d{2}$/'],
            'dqe_version_id' => ['nullable', 'integer', Rule::exists('dqe_versions', 'id')->where('project_id', $project->id)],
            'avancement_pct' => 'required|numeric|min:0|max:100',
            'detail_lots'    => 'nullable|array',
            'notes'          => 'nullable|string',
        ]);

        // P0: block avancement regression vs any non-brouillon situation
        $prevAvancement = SituationTravaux::where('project_id', $project->id)
            ->whereNotIn('status', ['brouillon'])
            ->orderByDesc('created_at')
            ->value('avancement_pct');

        if ($prevAvancement !== null && $data['avancement_pct'] < $prevAvancement) {
            return response()->json([
                'message'                  => "Avancement {$data['avancement_pct']}% inférieur au précédent certifié ({$prevAvancement}%). Régression interdite.",
                'avancement_precedent_pct' => $prevAvancement,
            ], 422);
        }

        // P0: compute montant_brut_ht server-side — saisie libre interdite
        ['base' => $base] = $this->resolveBaseCalcul($project, $data['dqe_version_id'] ?? null);
        $montantBrutHT = round($base * ($data['avancement_pct'] / 100), 2);

        $cumulPrecedent = SituationTravaux::where('project_id', $project->id)
            ->whereIn('status', ['validee_moe', 'payee'])
            ->sum('montant_brut_ht');

        $retenueAmount  = round($montantBrutHT * (config('btp.retenue_garantie_pct') / 100), 2);
        $avanceRembours = SituationTravaux::computeAvanceRemboursement($project, $montantBrutHT);
        $vatRate        = config('btp.tva_taux_standard');
        $baseHT         = $montantBrutHT - $retenueAmount - $avanceRembours;
        $vatAmount      = round($baseHT * ($vatRate / 100), 2);
        $netAPayer      = round($baseHT + $vatAmount, 2);

        $lastNum = SituationTravaux::where('project_id', $project->id)->count() + 1;
        $numero  = sprintf('ST-%03d', $lastNum);

        $situation = SituationTravaux::create([
            'project_id'              => $project->id,
            'company_id'              => $request->user()->company_id,
            'dqe_version_id'          => $data['dqe_version_id'] ?? null,
            'created_by'              => $request->user()->id,
            'numero'                  => $numero,
            'periode'                 => $data['periode'],
            'avancement_pct'          => $data['avancement_pct'],
            'montant_brut_ht'         => $montantBrutHT,
            'cumul_precedent_ht'      => $cumulPrecedent,
            'retenue_garantie_pct'    => config('btp.retenue_garantie_pct'),
            'retenue_garantie_amount' => $retenueAmount,
            'avance_remboursement'    => $avanceRembours,
            'vat_rate'                => $vatRate,
            'vat_amount'              => $vatAmount,
            'net_a_payer'             => $netAPayer,
            'detail_lots'             => $data['detail_lots'] ?? null,
            'notes'                   => $data['notes'] ?? null,
            'status'                  => 'brouillon',
        ]);

        return response()->json([
            'situation'                => $situation->load('creator:id,name'),
            'base_calcul'              => $base,
            'avancement_precedent_pct' => $prevAvancement,
        ], 201);
    }

    public function submit(Project $project, SituationTravaux $situation): JsonResponse
    {
        $this->authorize('update', $project);
        abort_if($situation->status !== 'brouillon', 422, 'Seul un brouillon peut être soumis.');
        $situation->update(['status' => 'soumise', 'submitted_at' => now()]);
        return response()->json(['situation' => $situation]);
    }

    public function validateSituation(Request $request, Project $project, SituationTravaux $situation): JsonResponse
    {
        $this->authorize('update', $project);
        abort_if($situation->status !== 'soumise', 422, 'Seule une situation soumise peut être validée MOE.');

        $situation->update([
            'status'       => 'validee_moe',
            'validated_by' => $request->user()->id,
            'validated_at' => now(),
        ]);

        $situation->load('project:id,name,code');

        // P2: notify creator (métreur) when validated
        if ($situation->created_by && $situation->created_by !== $request->user()->id) {
            $creator = User::find($situation->created_by);
            $creator?->notify(new SituationValidatedNotification($situation, $request->user()));
        }

        // P2: notify all comptables in company — Fatou must see validated situations immediately
        User::whereHas('role', fn($q) => $q->where('name', Roles::COMPTABLE_SLUG))
            ->where('company_id', $project->company_id)
            ->where('id', '!=', $request->user()->id)
            ->get()
            ->each(fn($u) => $u->notify(new SituationValidatedNotification($situation, $request->user())));

        return response()->json(['situation' => $situation]);
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    /**
     * Returns base de calcul = (DQE total_ht or montant_marche) + avenants signés.
     * @return array{base: float, avenants_sum: float}
     */
    private function resolveBaseCalcul(Project $project, int|string|null $dqeVersionId): array
    {
        $avenants = (float) Avenant::where('project_id', $project->id)
            ->where('status', 'signe')
            ->sum('montant_ht');

        if ($dqeVersionId) {
            $dqe = DqeVersion::find($dqeVersionId);
            $base = (float) ($dqe?->total_ht ?? $project->montant_marche ?? 0);
        } else {
            $base = (float) ($project->montant_marche ?? 0);
        }

        return ['base' => $base + $avenants, 'avenants_sum' => $avenants];
    }

    public function pay(Request $request, Project $project, SituationTravaux $situation): JsonResponse
    {
        $this->authorize('update', $project);
        abort_if($situation->status !== 'validee_moe', 422, 'Seule une situation validée MOE peut être payée.');
        $data = $request->validate(['date_paiement' => 'required|date']);

        $situation->update([
            'status'        => 'payee',
            'paid_by'       => $request->user()->id,
            'paid_at'       => now(),
            'date_paiement' => $data['date_paiement'],
        ]);

        // Audit trail: budget_entry type=paiement lié à cette situation
        BudgetEntry::create([
            'project_id'           => $project->id,
            'created_by'           => $request->user()->id,
            'type'                 => 'paiement',
            'category'             => 'Situations de travaux',
            'label'                => "Paiement {$situation->numero} – {$situation->periode}",
            'amount'               => $situation->net_a_payer,
            'entry_date'           => $data['date_paiement'],
            'note'                 => "Paiement automatique – situation validée MOE #{$situation->numero}",
            'situation_travaux_id' => $situation->id,
        ]);

        // P2: notify creator that payment is registered
        $situation->load('project:id,name,code');
        if ($situation->created_by && $situation->created_by !== $request->user()->id) {
            $creator = User::find($situation->created_by);
            $creator?->notify(new SituationPaidNotification($situation, $request->user()));
        }

        return response()->json(['situation' => $situation]);
    }
}
