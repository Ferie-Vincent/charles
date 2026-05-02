<?php

namespace App\Http\Controllers;

use App\Models\GeneralExpense;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GeneralExpenseController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $expenses = GeneralExpense::where('company_id', $request->user()->company_id)
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
        ]);

        return response()->json($expense, 201);
    }

    public function update(Request $request, GeneralExpense $generalExpense): JsonResponse
    {
        $this->authorizeCompany($request, $generalExpense);

        $validated = $request->validate([
            'category'     => 'sometimes|in:transport,hebergement,restauration,fournitures,communication,salaires,charges,autre',
            'label'        => 'sometimes|string|max:255',
            'amount'       => 'sometimes|numeric|min:0',
            'expense_date' => 'sometimes|date',
            'paid_by'      => 'nullable|string|max:255',
            'notes'        => 'nullable|string',
        ]);

        $generalExpense->update($validated);

        return response()->json($generalExpense);
    }

    public function destroy(Request $request, GeneralExpense $generalExpense): JsonResponse
    {
        $this->authorizeCompany($request, $generalExpense);
        $generalExpense->delete();

        return response()->json(null, 204);
    }

    private function authorizeCompany(Request $request, GeneralExpense $expense): void
    {
        abort_if($expense->company_id !== $request->user()->company_id, 403);
    }
}
