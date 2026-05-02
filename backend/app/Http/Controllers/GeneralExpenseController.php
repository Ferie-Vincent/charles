<?php

namespace App\Http\Controllers;

use App\Models\GeneralExpense;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GeneralExpenseController extends Controller
{
    private const APPROVER_ROLES = ['direction', 'directeur-technique'];

    public function index(Request $request): JsonResponse
    {
        $expenses = GeneralExpense::where('company_id', $request->user()->company_id)
            ->with('creator:id,name', 'approver:id,name')
            ->orderByDesc('expense_date')
            ->get();

        return response()->json($expenses);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'category'     => 'required|in:transport,hebergement,restauration,fournitures,communication,salaires,charges,autre',
            'label'        => 'required|string|max:255',
            'amount'       => 'required|numeric|min:0',
            'expense_date' => 'required|date',
            'paid_by'      => 'nullable|string|max:255',
            'notes'        => 'nullable|string',
        ]);

        $expense = GeneralExpense::create([
            ...$validated,
            'company_id' => $request->user()->company_id,
            'created_by' => $request->user()->id,
            'status'     => 'en_attente',
        ]);

        $expense->load('creator:id,name');

        return response()->json($expense, 201);
    }

    public function update(Request $request, GeneralExpense $generalExpense): JsonResponse
    {
        $this->authorizeCompany($request, $generalExpense);
        abort_if($generalExpense->status !== 'en_attente', 422, 'Seules les dépenses en attente peuvent être modifiées.');

        $validated = $request->validate([
            'category'     => 'sometimes|in:transport,hebergement,restauration,fournitures,communication,salaires,charges,autre',
            'label'        => 'sometimes|string|max:255',
            'amount'       => 'sometimes|numeric|min:0',
            'expense_date' => 'sometimes|date',
            'paid_by'      => 'nullable|string|max:255',
            'notes'        => 'nullable|string',
        ]);

        $generalExpense->update($validated);
        $generalExpense->load('creator:id,name', 'approver:id,name');

        return response()->json($generalExpense);
    }

    public function approve(Request $request, GeneralExpense $generalExpense): JsonResponse
    {
        $this->authorizeCompany($request, $generalExpense);
        $this->authorizeApprover($request);
        abort_if($generalExpense->status !== 'en_attente', 422, 'Cette dépense n\'est pas en attente d\'approbation.');

        $generalExpense->update([
            'status'      => 'approuvee',
            'approver_id' => $request->user()->id,
            'approved_at' => now(),
            'rejection_reason' => null,
        ]);

        $generalExpense->load('creator:id,name', 'approver:id,name');

        return response()->json($generalExpense);
    }

    public function reject(Request $request, GeneralExpense $generalExpense): JsonResponse
    {
        $this->authorizeCompany($request, $generalExpense);
        $this->authorizeApprover($request);
        abort_if($generalExpense->status !== 'en_attente', 422, 'Cette dépense n\'est pas en attente d\'approbation.');

        $request->validate(['reason' => 'required|string|max:500']);

        $generalExpense->update([
            'status'           => 'rejetee',
            'approver_id'      => $request->user()->id,
            'approved_at'      => null,
            'rejection_reason' => $request->reason,
        ]);

        $generalExpense->load('creator:id,name', 'approver:id,name');

        return response()->json($generalExpense);
    }

    public function destroy(Request $request, GeneralExpense $generalExpense): JsonResponse
    {
        $this->authorizeCompany($request, $generalExpense);
        abort_if($generalExpense->status === 'approuvee', 422, 'Une dépense approuvée ne peut pas être supprimée.');
        $generalExpense->delete();

        return response()->json(null, 204);
    }

    private function authorizeCompany(Request $request, GeneralExpense $expense): void
    {
        abort_if($expense->company_id !== $request->user()->company_id, 403);
    }

    private function authorizeApprover(Request $request): void
    {
        abort_unless(in_array($request->user()->role->name, self::APPROVER_ROLES), 403, 'Seuls la Direction et le DT peuvent approuver les dépenses.');
    }
}
