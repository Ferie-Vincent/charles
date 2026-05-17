<?php

namespace App\Http\Controllers;

use App\Http\Requests\LoginRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;

class AuthController extends Controller
{
    public function login(LoginRequest $request): JsonResponse
    {
        $credentials = $request->validated();

        if (! Auth::attempt($credentials)) {
            return response()->json([
                'message' => 'Invalid credentials.',
            ], 422);
        }

        $request->session()->regenerate();

        /** @var User $user */
        $user = Auth::user();
        $user->load(['company', 'role']);

        return response()->json([
            'user' => $user,
        ]);
    }

    public function logout(): JsonResponse
    {
        Auth::guard('web')->logout();
        request()->session()->invalidate();
        request()->session()->regenerateToken();

        return response()->json([
            'status' => 'ok',
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user()->load('role', 'company');

        if (!$user->role || !$user->company) {
            Auth::guard('web')->logout();
            $request->session()->invalidate();
            return response()->json(['message' => 'Compte désactivé.'], 401);
        }

        return response()->json([
            'user' => $user,
        ]);
    }

    public function showInvitation(string $token): JsonResponse
    {
        $user = User::where('invitation_token', $token)
            ->where('invitation_expires_at', '>', now())
            ->first();

        if (! $user) {
            return response()->json(['message' => "Lien d'invitation invalide ou expiré."], 404);
        }

        return response()->json([
            'name'  => $user->name,
            'email' => $user->email,
        ]);
    }

    public function acceptInvitation(Request $request, string $token): JsonResponse
    {
        $user = User::where('invitation_token', $token)
            ->where('invitation_expires_at', '>', now())
            ->first();

        if (! $user) {
            return response()->json(['message' => "Lien d'invitation invalide ou expiré."], 404);
        }

        $data = $request->validate([
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $user->update([
            'password'               => Hash::make($data['password']),
            'invitation_token'       => null,
            'invitation_expires_at'  => null,
            'must_change_password'   => false,
        ]);

        Auth::login($user);
        $request->session()->regenerate();
        $user->load(['company', 'role']);

        return response()->json(['user' => $user]);
    }

    public function forgotPassword(Request $request): JsonResponse
    {
        $request->validate(['email' => ['required', 'email']]);

        $status = Password::sendResetLink($request->only('email'));

        return response()->json([
            'message' => $status === Password::RESET_LINK_SENT
                ? 'Un email de réinitialisation a été envoyé.'
                : 'Email introuvable.',
        ], $status === Password::RESET_LINK_SENT ? 200 : 422);
    }

    public function resetPassword(Request $request): JsonResponse
    {
        $data = $request->validate([
            'token'    => ['required'],
            'email'    => ['required', 'email'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $status = Password::reset($data, function (User $user, string $password) {
            $user->forceFill([
                'password'             => Hash::make($password),
                'must_change_password' => false,
            ])->save();

            $user->setRememberToken(Str::random(60));
        });

        if ($status !== Password::PASSWORD_RESET) {
            return response()->json(['message' => 'Lien invalide ou expiré.'], 422);
        }

        return response()->json(['message' => 'Mot de passe réinitialisé avec succès.']);
    }
}
