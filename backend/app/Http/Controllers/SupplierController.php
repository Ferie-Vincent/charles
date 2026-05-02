<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Models\Supplier;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class SupplierController extends Controller
{
    public function index(Project $project): JsonResponse
    {
        $this->authorize('view', $project);

        $suppliers = $project->suppliers()
            ->withCount('invoices')
            ->withSum('invoices', 'amount_ht')
            ->orderBy('name')
            ->get();

        return response()->json($suppliers);
    }

    public function store(Request $request, Project $project): JsonResponse
    {
        $this->authorize('update', $project);

        $data = $request->validate([
            'name'            => 'required|string|max:255',
            'category'        => 'required|in:travaux,fournitures,services,sous-traitance,location',
            'contact_name'    => 'nullable|string|max:255',
            'phone'           => 'nullable|string|max:30',
            'email'           => 'nullable|email|max:255',
            'contract_amount' => 'nullable|numeric|min:0',
            'notes'           => 'nullable|string|max:1000',
        ]);

        $supplier = $project->suppliers()->create($data);

        return response()->json($supplier, 201);
    }

    public function update(Request $request, Project $project, Supplier $supplier): JsonResponse
    {
        $this->authorize('update', $project);
        abort_if($supplier->project_id !== $project->id, 404);

        $data = $request->validate([
            'name'            => 'required|string|max:255',
            'category'        => 'required|in:travaux,fournitures,services,sous-traitance,location',
            'contact_name'    => 'nullable|string|max:255',
            'phone'           => 'nullable|string|max:30',
            'email'           => 'nullable|email|max:255',
            'contract_amount' => 'nullable|numeric|min:0',
            'notes'           => 'nullable|string|max:1000',
        ]);

        $supplier->update($data);

        return response()->json($supplier);
    }

    public function destroy(Project $project, Supplier $supplier): Response
    {
        $this->authorize('update', $project);
        abort_if($supplier->project_id !== $project->id, 404);
        $supplier->delete();
        return response()->noContent();
    }
}
