<?php

namespace App\Http\Controllers;

use App\Models\Supplier;
use App\Support\Roles;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class GlobalSupplierController extends Controller
{
    private const CATEGORIES = ['travaux', 'fournitures', 'services', 'sous-traitance', 'location'];

    public function index(Request $request): JsonResponse
    {
        abort_unless(
            in_array($request->user()->role->name, [...Roles::MANAGEMENT, ...Roles::FINANCE, ...Roles::LOGISTICS]),
            403,
            'Accès aux fournisseurs non autorisé.'
        );

        $suppliers = Supplier::where('company_id', $request->user()->company_id)
            ->withCount('invoices')
            ->withSum('invoices', 'amount_ht')
            ->with('project:id,name,code')
            ->orderBy('name')
            ->get();

        return response()->json($suppliers);
    }

    public function store(Request $request): JsonResponse
    {
        abort_unless(
            in_array($request->user()->role->name, [...Roles::LOGISTICS, ...Roles::FINANCE]),
            403,
            'Gestion des fournisseurs non autorisée pour ce rôle.'
        );

        $data = $request->validate([
            'name'            => 'required|string|max:255',
            'category'        => 'required|in:' . implode(',', self::CATEGORIES),
            'contact_name'    => 'nullable|string|max:255',
            'phone'           => 'nullable|string|max:30',
            'email'           => 'nullable|email|max:255',
            'contract_amount' => 'nullable|numeric|min:0',
            'notes'           => 'nullable|string|max:1000',
        ]);

        $supplier = Supplier::create([
            ...$data,
            'company_id' => $request->user()->company_id,
            'created_by' => $request->user()->id,
        ]);

        return response()->json($supplier, 201);
    }

    public function show(Request $request, Supplier $supplier): JsonResponse
    {
        abort_unless(
            in_array($request->user()->role->name, [...Roles::MANAGEMENT, ...Roles::FINANCE, ...Roles::LOGISTICS]),
            403,
            'Accès aux fournisseurs non autorisé.'
        );

        abort_if($supplier->company_id !== $request->user()->company_id, 404);

        $supplier->loadCount('invoices')
                 ->loadSum('invoices', 'amount_ht')
                 ->load('project:id,name,code', 'invoices.project:id,name,code');

        return response()->json($supplier);
    }

    public function update(Request $request, Supplier $supplier): JsonResponse
    {
        abort_if($supplier->company_id !== $request->user()->company_id, 403);
        abort_unless(
            in_array($request->user()->role->name, [...Roles::LOGISTICS, ...Roles::FINANCE]),
            403,
            'Gestion des fournisseurs non autorisée pour ce rôle.'
        );

        $data = $request->validate([
            'name'            => 'sometimes|required|string|max:255',
            'category'        => 'sometimes|required|in:' . implode(',', self::CATEGORIES),
            'contact_name'    => 'nullable|string|max:255',
            'phone'           => 'nullable|string|max:30',
            'email'           => 'nullable|email|max:255',
            'contract_amount' => 'nullable|numeric|min:0',
            'notes'           => 'nullable|string|max:1000',
        ]);

        $supplier->update($data);

        return response()->json($supplier);
    }

    public function destroy(Request $request, Supplier $supplier): Response
    {
        abort_if($supplier->company_id !== $request->user()->company_id, 403);
        abort_unless(
            in_array($request->user()->role->name, [...Roles::LOGISTICS, ...Roles::FINANCE]),
            403,
            'Gestion des fournisseurs non autorisée pour ce rôle.'
        );
        abort_if($supplier->invoices()->exists(), 422);

        $supplier->delete();
        return response()->noContent();
    }
}
