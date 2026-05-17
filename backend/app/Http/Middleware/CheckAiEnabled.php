<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckAiEnabled
{
    public function handle(Request $request, Closure $next): Response
    {
        $company = $request->user()?->company;

        if ($company && ! $company->ai_enabled) {
            return response()->json([
                'ai_disabled' => true,
                'message'     => 'Le module IA est désactivé pour cette entreprise. Activez-le dans Paramètres → IA.',
            ], 503);
        }

        return $next($request);
    }
}
