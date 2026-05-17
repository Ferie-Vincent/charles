<?php

namespace App\Http\Controllers;

use App\Models\Company;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;

/**
 * Bootstrap du super-admin — disponible une seule fois.
 *
 * Dès que l'utilisateur direction@charles.ci existe en base, l'endpoint
 * refuse toute nouvelle tentative (409 Conflict). Aucune authentification
 * requise : c'est précisément le point d'entrée initial avant tout utilisateur.
 *
 * Email autorisé : direction@charles.ci uniquement (valeur codée en dur).
 */
class SetupController extends Controller
{
    private const SUPER_ADMIN_EMAIL = 'direction@charles.ci';

    /** Vérifie si le setup est disponible (aucun super-admin en base). */
    public function status(): JsonResponse
    {
        $available = ! User::where('email', self::SUPER_ADMIN_EMAIL)->exists();

        return response()->json(['available' => $available]);
    }

    /** Crée le super-admin et son entreprise. Disponible une seule fois. */
    public function create(Request $request): JsonResponse
    {
        // Garde idempotente — refuse si déjà configuré
        if (User::where('email', self::SUPER_ADMIN_EMAIL)->exists()) {
            return response()->json([
                'message' => 'Le super-admin est déjà configuré.',
            ], 409);
        }

        $data = $request->validate([
            'name'                  => ['required', 'string', 'max:255'],
            'password'              => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $company = Company::firstOrCreate(
            ['slug' => 'entreprise-charles'],
            ['name' => 'Entreprise Charles']
        );

        $role = Role::where('name', 'direction')->firstOrFail();

        $user = User::create([
            'name'       => $data['name'],
            'email'      => self::SUPER_ADMIN_EMAIL,
            'password'   => Hash::make($data['password']),
            'company_id' => $company->id,
            'role_id'    => $role->id,
        ]);

        Auth::login($user);
        $request->session()->regenerate();
        $user->load(['company', 'role']);

        return response()->json(['user' => $user], 201);
    }
}
