<?php

namespace App\Services;

use App\Models\Project;
use App\Models\SituationTravaux;
use Carbon\Carbon;

/**
 * Une seule vérité d'avancement par chantier.
 *
 * Deux sources coexistent :
 *  - DÉCLARÉ  : daily_logs.progress_percent, saisi par le chef de chantier (subjectif, quotidien)
 *  - CERTIFIÉ : situation_travaux.avancement_pct validée MOE ou payée (contractuel, mensuel)
 *
 * Règle : le certifié prime s'il existe et date de moins de CERTIFIED_MAX_AGE_DAYS ; sinon le
 * déclaré. Le Health Score et l'alerte « retard > 10 pts » lisent ce résolveur — l'indicateur
 * n'est donc plus pilotable par la seule personne qu'il évalue (Mary, round 1).
 *
 * Les deux valeurs sont toujours exposées pour que l'écran puisse afficher l'écart déclaré/certifié.
 */
class ProjectProgressResolver
{
    /** Au-delà, une situation certifiée est trop ancienne pour refléter l'avancement courant. */
    public const CERTIFIED_MAX_AGE_DAYS = 60;

    /**
     * @return array{
     *   value: float,
     *   source: 'certified'|'declared'|'none',
     *   declared: float|null,
     *   declared_at: string|null,
     *   certified: float|null,
     *   certified_at: string|null,
     *   gap: float|null
     * }
     */
    public function resolve(Project $project): array
    {
        // ── Déclaré (dernier journal) ──────────────────────────────────────
        $logs = $project->relationLoaded('dailyLogs')
            ? $project->dailyLogs
            : $project->dailyLogs()->orderByDesc('log_date')->limit(1)->get();

        $lastLog     = $logs->sortByDesc('log_date')->first();
        $declared    = $lastLog ? (float) $lastLog->progress_percent : null;
        $declaredAt  = $lastLog?->log_date ? Carbon::parse($lastLog->log_date)->toDateString() : null;

        // ── Certifié (dernière situation validée MOE / payée) ───────────────
        $situation = SituationTravaux::where('project_id', $project->id)
            ->whereIn('status', ['validee_moe', 'payee'])
            ->orderByDesc('validated_at')
            ->orderByDesc('id')
            ->first(['avancement_pct', 'validated_at', 'paid_at', 'created_at']);

        $certified   = $situation ? (float) $situation->avancement_pct : null;
        $certifiedAt = $situation
            ? Carbon::parse($situation->validated_at ?? $situation->paid_at ?? $situation->created_at)->toDateString()
            : null;

        $certifiedFresh = $certifiedAt !== null
            && Carbon::parse($certifiedAt)->diffInDays(Carbon::today()) <= self::CERTIFIED_MAX_AGE_DAYS;

        // ── Résolution ──────────────────────────────────────────────────────
        if ($certified !== null && $certifiedFresh) {
            $value  = $certified;
            $source = 'certified';
        } elseif ($declared !== null) {
            $value  = $declared;
            $source = 'declared';
        } else {
            $value  = $certified ?? 0.0;
            $source = $certified !== null ? 'certified' : 'none';
        }

        return [
            'value'        => round($value, 2),
            'source'       => $source,
            'declared'     => $declared,
            'declared_at'  => $declaredAt,
            'certified'    => $certified,
            'certified_at' => $certifiedAt,
            'gap'          => ($declared !== null && $certified !== null) ? round($declared - $certified, 2) : null,
        ];
    }
}
