<?php

namespace App\Http\Controllers;

use App\Models\Role;
use App\Models\RolePermission;
use App\Support\Roles;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PermissionsController extends Controller
{
    private const FEATURES = ['projects', 'map', 'timeline', 'dqe', 'execution', 'costs', 'accounting', 'qse', 'reporting', 'achats', 'stocks', 'suppliers', 'besoins', 'ged'];

    // Roles direction/directeur-technique always have full access — not configurable

    public function index(Request $request): JsonResponse
    {
        if ($request->user()->role->name !== 'direction') {
            abort(403);
        }

        $companyId   = $request->user()->company_id;
        $permissions = RolePermission::with('role')
            ->where('company_id', $companyId)
            ->get();

        $roles = Role::whereNotIn('name', Roles::LOCKED)->orderBy('id')->get();

        $matrix = [];
        foreach ($roles as $role) {
            $matrix[$role->name] = [
                'label' => $role->label,
            ];
            foreach (self::FEATURES as $feature) {
                $perm = $permissions->first(fn($p) => $p->role_id === $role->id && $p->feature === $feature);
                $matrix[$role->name]['features'][$feature] = $perm?->enabled ?? false;
            }
        }

        return response()->json([
            'features' => self::FEATURES,
            'matrix'   => $matrix,
        ]);
    }

    public function myPermissions(Request $request): JsonResponse
    {
        $user = $request->user();

        if (in_array($user->role->name, Roles::LOCKED)) {
            return response()->json(['features' => array_fill_keys(self::FEATURES, true)]);
        }

        $perms = RolePermission::where('company_id', $user->company_id)
            ->where('role_id', $user->role_id)
            ->pluck('enabled', 'feature');

        $features = [];
        foreach (self::FEATURES as $f) {
            $features[$f] = (bool) ($perms[$f] ?? false);
        }

        return response()->json(['features' => $features]);
    }

    public function update(Request $request): JsonResponse
    {
        if ($request->user()->role->name !== 'direction') {
            abort(403);
        }

        $data = $request->validate([
            'permissions'                   => ['required', 'array'],
            'permissions.*.role_name'       => ['required', 'string', 'exists:roles,name'],
            'permissions.*.feature'         => ['required', 'string', 'in:' . implode(',', self::FEATURES)],
            'permissions.*.enabled'         => ['required', 'boolean'],
        ]);

        $companyId = $request->user()->company_id;
        $roles     = Role::query()->pluck('id', 'name');

        foreach ($data['permissions'] as $item) {
            if (in_array($item['role_name'], Roles::LOCKED)) continue;

            RolePermission::updateOrCreate(
                [
                    'company_id' => $companyId,
                    'role_id'    => $roles[$item['role_name']],
                    'feature'    => $item['feature'],
                ],
                ['enabled' => $item['enabled']]
            );
        }

        return $this->index($request);
    }
}
