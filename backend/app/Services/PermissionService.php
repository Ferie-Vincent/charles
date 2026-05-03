<?php

namespace App\Services;

use App\Models\RolePermission;
use App\Models\User;
use Illuminate\Support\Facades\Cache;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;

class PermissionService
{
    /**
     * Roles that always bypass all permission checks.
     */
    private const DIRECTION_ROLES = ['direction', 'directeur-technique'];

    /**
     * Write-access rules per feature.
     * Keys are feature names; values are the role slugs allowed to write.
     */
    private const WRITE_RULES = [
        'stocks'          => ['moyens-generaux', 'direction', 'directeur-technique'],
        'dqe'             => ['metreur-economiste', 'conducteur-travaux', 'direction', 'directeur-technique'],
        'achats'          => ['moyens-generaux', 'direction', 'directeur-technique'],
        'portfolio'       => ['direction', 'directeur-technique'],
        'accounting'      => ['comptable', 'direction', 'directeur-technique'],
        'costs'           => ['metreur-economiste', 'comptable', 'direction', 'directeur-technique'],
        'ai-analysis'     => ['direction', 'directeur-technique'],
        'invoice.validate' => ['comptable', 'direction', 'directeur-technique'],
    ];

    /**
     * Vérifie si l'user peut accéder (lire) une feature.
     * Direction/DT bypasse tout. Sinon on interroge role_permissions en DB
     * avec un cache per-request pour éviter les requêtes répétées.
     */
    public function canAccess(User $user, string $feature): bool
    {
        if ($this->isDirectionOrDT($user)) {
            return true;
        }

        return $this->resolveDbPermission($user, $feature);
    }

    /**
     * Vérifie si l'user peut écrire sur une feature (règles hardcodées).
     * Direction/DT bypasse tout.
     */
    public function canWrite(User $user, string $feature): bool
    {
        if ($this->isDirectionOrDT($user)) {
            return true;
        }

        $roleSlug = $this->getRoleSlug($user);

        $allowed = self::WRITE_RULES[$feature] ?? [];

        return in_array($roleSlug, $allowed, true);
    }

    /**
     * Lève une 403 si l'user ne peut pas accéder à la feature.
     */
    public function requireAccess(User $user, string $feature): void
    {
        if (! $this->canAccess($user, $feature)) {
            throw new AccessDeniedHttpException(
                "Accès refusé à la fonctionnalité : {$feature}"
            );
        }
    }

    /**
     * Lève une 403 si l'user ne peut pas écrire sur la feature.
     */
    public function requireWrite(User $user, string $feature): void
    {
        if (! $this->canWrite($user, $feature)) {
            throw new AccessDeniedHttpException(
                "Permission d'écriture refusée pour la fonctionnalité : {$feature}"
            );
        }
    }

    /**
     * Indique si l'user appartient au groupe Direction ou DT.
     */
    public function isDirectionOrDT(User $user): bool
    {
        return in_array($this->getRoleSlug($user), self::DIRECTION_ROLES, true);
    }

    // -------------------------------------------------------------------------
    // Internals
    // -------------------------------------------------------------------------

    /**
     * Résout la permission d'accès depuis la DB avec un cache per-request
     * (utilise le pattern array_key_exists sur un tableau statique local).
     */
    private function resolveDbPermission(User $user, string $feature): bool
    {
        // Clé de cache = company + role + feature pour éviter toute collision.
        $cacheKey = "perm:{$user->company_id}:{$user->role_id}:{$feature}";

        // remember() avec durée 300s (5 min) — cohérent avec le TTL Sanctum session.
        return (bool) Cache::remember($cacheKey, 300, function () use ($user, $feature) {
            $record = RolePermission::query()
                ->where('company_id', $user->company_id)
                ->where('role_id', $user->role_id)
                ->where('feature', $feature)
                ->first();

            // Si pas de ligne en DB, on refuse par défaut.
            return $record?->enabled ?? false;
        });
    }

    /**
     * Retourne le slug de rôle de l'user (charge la relation si besoin).
     */
    private function getRoleSlug(User $user): string
    {
        // Utilise la relation si déjà chargée, sinon une requête simple.
        if ($user->relationLoaded('role') && $user->role !== null) {
            return $user->role->name;
        }

        return $user->role()->value('name') ?? '';
    }
}
