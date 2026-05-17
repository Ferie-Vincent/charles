<?php

namespace App\Http\Controllers;

use App\Models\Role;
use App\Models\User;
use App\Notifications\UserInvitedNotification;
use App\Support\Roles;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class UserController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', User::class);

        $users = User::with('role')
            ->where('company_id', $request->user()->company_id)
            ->orderBy('name')
            ->get()
            ->map(fn(User $u) => [
                'id'    => $u->id,
                'name'  => $u->name,
                'email' => $u->email,
                'role'  => ['id' => $u->role->id, 'name' => $u->role->name, 'label' => $u->role->label],
            ]);

        return response()->json($users);
    }

    public function roles(Request $request): JsonResponse
    {
        abort_unless(
            in_array($request->user()->role->name, Roles::MANAGEMENT),
            403,
            'Accès réservé à la direction.'
        );

        return response()->json(
            Role::orderBy('id')->get(['id', 'name', 'label'])
        );
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', User::class);

        $data = $request->validate([
            'name'    => ['required', 'string', 'max:255'],
            'email'   => ['required', 'email', 'unique:users,email'],
            'role_id' => ['required', 'exists:roles,id'],
        ]);

        $token = Str::random(64);

        $user = User::create([
            'name'                   => $data['name'],
            'email'                  => $data['email'],
            'password'               => Hash::make(Str::random(32)),
            'company_id'             => $request->user()->company_id,
            'role_id'                => $data['role_id'],
            'invitation_token'       => $token,
            'invitation_expires_at'  => now()->addDays(7),
            'must_change_password'   => true,
        ]);

        $user->load('role');

        $invitationUrl = config('app.frontend_url', 'http://localhost:5174') . '/invitation/' . $token;

        $user->notify(new UserInvitedNotification($invitationUrl, $request->user()->name));

        return response()->json([
            'id'             => $user->id,
            'name'           => $user->name,
            'email'          => $user->email,
            'role'           => ['id' => $user->role->id, 'name' => $user->role->name, 'label' => $user->role->label],
            'invitation_url' => $invitationUrl,
        ], 201);
    }

    public function update(Request $request, User $user): JsonResponse
    {
        abort_if($user->company_id !== $request->user()->company_id, 403, 'Accès refusé.');

        $this->authorize('update', $user);

        $data = $request->validate([
            'name'     => ['required', 'string', 'max:255'],
            'email'    => ['required', 'email', Rule::unique('users', 'email')->ignore($user->id)],
            'role_id'  => ['required', 'exists:roles,id'],
            'password' => ['nullable', 'string', 'min:8'],
        ]);

        $update = [
            'name'    => $data['name'],
            'email'   => $data['email'],
            'role_id' => $data['role_id'],
        ];

        if (!empty($data['password'])) {
            $update['password'] = Hash::make($data['password']);
        }

        $user->update($update);
        $user->load('role');

        return response()->json([
            'id'    => $user->id,
            'name'  => $user->name,
            'email' => $user->email,
            'role'  => ['id' => $user->role->id, 'name' => $user->role->name, 'label' => $user->role->label],
        ]);
    }

    public function destroy(Request $request, User $user): JsonResponse
    {
        abort_if($user->company_id !== $request->user()->company_id, 403, 'Accès refusé.');

        $this->authorize('delete', $user);

        // Prevent deleting the last direction user — company would be left without an admin
        if ($user->role->name === 'direction') {
            $directionCount = User::where('company_id', $user->company_id)
                ->whereHas('role', fn($q) => $q->where('name', 'direction'))
                ->count();
            abort_if($directionCount <= 1, 422, 'Impossible de supprimer le dernier utilisateur Direction de la société.');
        }

        $user->delete();
        return response()->json(null, 204);
    }
}
