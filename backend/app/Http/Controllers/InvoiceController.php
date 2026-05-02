<?php

namespace App\Http\Controllers;

use App\Models\Invoice;
use App\Models\Project;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Storage;

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
            'attachment'   => 'nullable|file|mimes:pdf,jpg,jpeg,png|max:10240',
        ]);

        $invoice = $project->invoices()->create([
            ...collect($data)->except('attachment')->all(),
            'created_by' => $request->user()->id,
        ]);

        if ($request->hasFile('attachment')) {
            $this->storeAttachment($request, $invoice);
        }

        $invoice->load('supplier:id,name');

        return response()->json($invoice, 201);
    }

    public function update(Request $request, Project $project, Invoice $invoice): JsonResponse
    {
        $this->authorize('update', $project);
        abort_if($invoice->project_id !== $project->id, 404);

        $data = $request->validate([
            'reference'    => 'sometimes|required|string|max:100',
            'category'     => 'sometimes|required|string|max:100',
            'amount_ht'    => 'sometimes|required|numeric|min:0',
            'amount_ttc'   => 'nullable|numeric|min:0',
            'status'       => 'sometimes|required|in:brouillon,soumise,validee,payee,disputee',
            'invoice_date' => 'sometimes|required|date',
            'due_date'     => 'nullable|date',
            'paid_date'    => 'nullable|date',
            'supplier_id'  => 'nullable|exists:suppliers,id',
            'note'         => 'nullable|string|max:1000',
            'attachment'   => 'nullable|file|mimes:pdf,jpg,jpeg,png|max:10240',
        ]);

        $invoice->update(collect($data)->except('attachment')->all());

        if ($request->hasFile('attachment')) {
            // Remove old file
            if ($invoice->attachment_path) {
                Storage::disk('public')->delete($invoice->attachment_path);
            }
            $this->storeAttachment($request, $invoice);
        }

        $invoice->load('supplier:id,name');

        return response()->json($invoice);
    }

    public function destroy(Project $project, Invoice $invoice): Response
    {
        $this->authorize('update', $project);
        abort_if($invoice->project_id !== $project->id, 404);

        if ($invoice->attachment_path) {
            Storage::disk('public')->delete($invoice->attachment_path);
        }

        $invoice->delete();
        return response()->noContent();
    }

    public function downloadAttachment(Project $project, Invoice $invoice): \Symfony\Component\HttpFoundation\StreamedResponse
    {
        $this->authorize('view', $project);
        abort_if($invoice->project_id !== $project->id || !$invoice->attachment_path, 404);

        return Storage::disk('public')->download(
            $invoice->attachment_path,
            $invoice->attachment_name ?? 'piece-jointe'
        );
    }

    private function storeAttachment(Request $request, Invoice $invoice): void
    {
        $file = $request->file('attachment');
        $name = $file->getClientOriginalName();
        $path = $file->storeAs("invoices/{$invoice->id}", $name, 'public');

        $invoice->update(['attachment_path' => $path, 'attachment_name' => $name]);
    }
}
