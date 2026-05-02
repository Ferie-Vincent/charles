<?php

namespace App\Http\Controllers;

use App\Models\Invoice;
use App\Models\Project;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class InvoiceController extends Controller
{
    public function index(Project $project): JsonResponse
    {
        $this->authorize('view', $project);

        $invoices = $project->invoices()
            ->with('supplier:id,name')
            ->orderByDesc('invoice_date')
            ->get();

        return response()->json($invoices);
    }

    public function store(Request $request, Project $project): JsonResponse
    {
        $this->authorize('update', $project);

        $data = $request->validate([
            'reference'    => 'required|string|max:100',
            'category'     => 'required|string|max:100',
            'amount_ht'    => 'required|numeric|min:0',
            'amount_ttc'   => 'nullable|numeric|min:0',
            'status'       => 'required|in:brouillon,soumise,validee,payee,disputee',
            'invoice_date' => 'required|date',
            'due_date'     => 'nullable|date',
            'paid_date'    => 'nullable|date',
            'supplier_id'  => 'nullable|exists:suppliers,id',
            'note'         => 'nullable|string|max:1000',
        ]);

        $invoice = $project->invoices()->create([
            ...$data,
            'created_by' => $request->user()->id,
        ]);

        $invoice->load('supplier:id,name');

        return response()->json($invoice, 201);
    }

    public function update(Request $request, Project $project, Invoice $invoice): JsonResponse
    {
        $this->authorize('update', $project);
        abort_if($invoice->project_id !== $project->id, 404);

        $data = $request->validate([
            'reference'    => 'required|string|max:100',
            'category'     => 'required|string|max:100',
            'amount_ht'    => 'required|numeric|min:0',
            'amount_ttc'   => 'nullable|numeric|min:0',
            'status'       => 'required|in:brouillon,soumise,validee,payee,disputee',
            'invoice_date' => 'required|date',
            'due_date'     => 'nullable|date',
            'paid_date'    => 'nullable|date',
            'supplier_id'  => 'nullable|exists:suppliers,id',
            'note'         => 'nullable|string|max:1000',
        ]);

        $invoice->update($data);
        $invoice->load('supplier:id,name');

        return response()->json($invoice);
    }

    public function destroy(Project $project, Invoice $invoice): Response
    {
        $this->authorize('update', $project);
        abort_if($invoice->project_id !== $project->id, 404);
        $invoice->delete();
        return response()->noContent();
    }
}
