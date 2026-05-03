<?php

namespace App\Http\Middleware;

use App\Services\PermissionService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Middleware de vérification des permissions de feature.
 *
 * Usage en route :
 *   ->middleware('permission:stocks')         // vérifie l'accès (lecture)
 *   ->middleware('permission:stocks.write')   // vérifie l'écriture
 */
class CheckPermission
{
    public function handle(Request $request, Closure $next, string $permission): Response
    {
        // Décompose "feature" ou "feature.type" (access par défaut).
        [$feature, $type] = explode('.', $permission, 2) + [1 => 'access'];

        $service = new PermissionService();
        $user    = $request->user();

        if ($type === 'write') {
            $service->requireWrite($user, $feature);
        } else {
            $service->requireAccess($user, $feature);
        }

        return $next($request);
    }
}
