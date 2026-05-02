<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
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
}
