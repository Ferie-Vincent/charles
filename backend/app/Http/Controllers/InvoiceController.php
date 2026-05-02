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
    private const VALIDATOR_ROLES = ['direction', 'directeur-technique'];

    public function index(Project $project): JsonResponse
    {
        $this->authorize('view', $project);

        $invoices = $project->invoices()
            ->with('supplier:id,name', 'validator:id,name', 'payer:id,name')
            ->orderByDesc('invoice_date')
            ->get();

        return response()->json($invoices);
    }

    public function store(Request $request, Project $project): JsonResponse
    {
        $this->authorize('update', $project);
        abort_unless($request->user()->role->name === 'comptable', 403, 'Seul le comptable peut enregistrer des factures.');

        $data = $request->validate([
            'reference'    => 'required|string|max:100',
            'category'     => 'required|string|max:100',
            'amount_ht'    => 'required|numeric|min:0',
            'amount_ttc'   => 'nullable|numeric|min:0',
            'invoice_date' => 'required|date',
            'due_date'     => 'nullable|date',
            'supplier_id'  => 'nullable|exists:suppliers,id',
            'note'         => 'nullable|string|max:1000',
            'attachment'   => 'nullable|file|mimes:pdf,jpg,jpeg,png|max:10240',
        ]);

        $invoice = $project->invoices()->create([
            ...collect($data)->except('attachment')->all(),
            'status'     => 'soumise',
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
        abort_unless($request->user()->role->name === 'comptable', 403, 'Seul le comptable peut modifier les factures.');
        abort_if($invoice->project_id !== $project->id, 404);
        abort_if(
            in_array($invoice->status, ['validee', 'payee']),
            422,
            'Une facture validée ou payée ne peut plus être modifiée.'
        );

        $data = $request->validate([
            'reference'    => 'sometimes|required|string|max:100',
            'category'     => 'sometimes|required|string|max:100',
            'amount_ht'    => 'sometimes|required|numeric|min:0',
            'amount_ttc'   => 'nullable|numeric|min:0',
            'invoice_date' => 'sometimes|required|date',
            'due_date'     => 'nullable|date',
            'supplier_id'  => 'nullable|exists:suppliers,id',
            'note'         => 'nullable|string|max:1000',
            'attachment'   => 'nullable|file|mimes:pdf,jpg,jpeg,png|max:10240',
        ]);

        $invoice->update(collect($data)->except('attachment')->all());

        if ($request->hasFile('attachment')) {
            if ($invoice->attachment_path) {
                Storage::disk('public')->delete($invoice->attachment_path);
            }
            $this->storeAttachment($request, $invoice);
        }

        $invoice->load('supplier:id,name');

        return response()->json($invoice);
    }

    /** Direction / DT uniquement : soumise → validee */
    public function validate(Request $request, Project $project, Invoice $invoice): JsonResponse
    {
        $this->authorize('view', $project);
        abort_if($invoice->project_id !== $project->id, 404);
        abort_unless(
            in_array($request->user()->role->name, self::VALIDATOR_ROLES),
            403,
            'Seul le DG ou le DT peut valider une facture.'
        );
        abort_if($invoice->status !== 'soumise', 422, 'Seules les factures soumises peuvent être validées.');

        $invoice->update([
            'status'       => 'validee',
            'validated_by' => $request->user()->id,
            'validated_at' => now(),
        ]);

        $invoice->load('supplier:id,name', 'validator:id,name');

        return response()->json($invoice);
    }

    /** Comptable uniquement : validee → payee, preuve de paiement obligatoire */
    public function pay(Request $request, Project $project, Invoice $invoice): JsonResponse
    {
        $this->authorize('view', $project);
        abort_if($invoice->project_id !== $project->id, 404);
        abort_unless(
            $request->user()->role->name === 'comptable',
            403,
            'Seul le comptable peut enregistrer un paiement.'
        );
        abort_if($invoice->status !== 'validee', 422, 'Seules les factures validées peuvent être marquées payées.');

        $request->validate([
            'paid_date'     => 'required|date',
            'payment_proof' => 'required|file|mimes:pdf,jpg,jpeg,png|max:10240',
            'note'          => 'nullable|string|max:500',
        ]);

        $proof     = $request->file('payment_proof');
        $proofName = $proof->getClientOriginalName();
        $proofPath = $proof->storeAs("invoices/{$invoice->id}/payment", $proofName, 'public');

        $invoice->update([
            'status'             => 'payee',
            'paid_date'          => $request->paid_date,
            'paid_by'            => $request->user()->id,
            'paid_at'            => now(),
            'payment_proof_path' => $proofPath,
            'payment_proof_name' => $proofName,
            'note'               => $request->note ?? $invoice->note,
        ]);

        $invoice->load('supplier:id,name', 'validator:id,name', 'payer:id,name');

        return response()->json($invoice);
    }

    public function destroy(Project $project, Invoice $invoice): Response
    {
        $this->authorize('update', $project);
        abort_unless(auth()->user()->role->name === 'comptable', 403, 'Seul le comptable peut supprimer les factures.');
        abort_if($invoice->project_id !== $project->id, 404);
        abort_if(
            in_array($invoice->status, ['validee', 'payee']),
            422,
            'Impossible de supprimer une facture validée ou payée.'
        );

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

    public function downloadPaymentProof(Project $project, Invoice $invoice): \Symfony\Component\HttpFoundation\StreamedResponse
    {
        $this->authorize('view', $project);
        abort_if($invoice->project_id !== $project->id || !$invoice->payment_proof_path, 404);

        return Storage::disk('public')->download(
            $invoice->payment_proof_path,
            $invoice->payment_proof_name ?? 'preuve-paiement'
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
