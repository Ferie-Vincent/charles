<?php

namespace App\Http\Controllers;

use App\Models\Invoice;
use App\Models\Project;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

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
            'status'       => 'required|in:brouillon,soumise',
            'invoice_date' => 'required|date',
            'due_date'     => 'nullable|date',
            'supplier_id'  => ['nullable', Rule::exists('suppliers', 'id')->where('project_id', $project->id)],
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
        abort_if($invoice->status === 'payee', 422, 'Une facture payée ne peut pas être modifiée.');
        abort_if($invoice->status === 'disputee', 422, 'Une facture en litige ne peut pas être modifiée directement. Utilisez la transition.');

        $data = $request->validate([
            'reference'    => 'sometimes|required|string|max:100',
            'category'     => 'sometimes|required|string|max:100',
            'amount_ht'    => 'sometimes|required|numeric|min:0',
            'amount_ttc'   => 'nullable|numeric|min:0',
            'status'       => 'sometimes|required|in:brouillon,soumise',
            'invoice_date' => 'sometimes|required|date',
            'due_date'     => 'nullable|date',
            'supplier_id'  => ['nullable', Rule::exists('suppliers', 'id')->where('project_id', $project->id)],
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
        abort_if($invoice->status === 'payee', 422, 'Une facture payée ne peut pas être supprimée.');
        abort_if($invoice->status === 'disputee', 422, 'Résolvez le litige avant de supprimer cette facture.');

        if ($invoice->attachment_path) {
            Storage::disk('public')->delete($invoice->attachment_path);
        }

        $invoice->delete();
        return response()->noContent();
    }

    public function transition(Request $request, Project $project, Invoice $invoice): JsonResponse
    {
        $this->authorize('update', $project);
        abort_if($invoice->project_id !== $project->id, 404);

        $data = $request->validate([
            'status' => 'required|in:soumise,validee,disputee',
        ]);

        $user    = $request->user();
        $current = $invoice->status;
        $to      = $data['status'];
        $role    = $user->role->name;

        $transitions = [
            'brouillon' => ['soumise'],
            'soumise'   => ['validee', 'disputee'],
            'validee'   => ['disputee'],
            'disputee'  => ['soumise'],
        ];

        abort_unless(
            isset($transitions[$current]) && in_array($to, $transitions[$current]),
            422,
            "Transition {$current} → {$to} non autorisée."
        );

        $directionRoles = ['direction', 'directeur-technique'];
        $comptableRoles = ['comptable', 'direction', 'directeur-technique'];
        $allWriteRoles  = ['conducteur-travaux', 'chef-chantier', 'metreur-economiste', 'comptable', 'direction', 'directeur-technique'];

        if ($to === 'soumise' && $current !== 'disputee') {
            abort_unless(in_array($role, $allWriteRoles), 403, 'Rôle insuffisant.');
        } elseif ($current === 'disputee' && $to === 'soumise') {
            abort_unless(in_array($role, $directionRoles), 403, 'Résolution litige réservée à la direction.');
        } elseif ($to === 'validee') {
            abort_unless(in_array($role, $directionRoles), 403, 'Validation réservée à la direction.');
        } elseif ($to === 'disputee') {
            abort_unless(in_array($role, $directionRoles), 403, 'Réservé à la direction.');
        }

        $updates = ['status' => $to];
        if ($to === 'validee') $updates += ['validated_by' => $user->id, 'validated_at' => now()];

        $invoice->update($updates);
        $invoice->load('supplier:id,name');

        return response()->json($invoice);
    }

    public function pay(Request $request, Project $project, Invoice $invoice): JsonResponse
    {
        $this->authorize('update', $project);
        abort_if($invoice->project_id !== $project->id, 404);
        abort_unless(
            $request->user()->role->name === 'comptable',
            403,
            'Paiement réservé au comptable.'
        );
        abort_unless($invoice->status === 'validee', 422, 'Seule une facture validée peut être payée.');

        $data = $request->validate([
            'paid_date'     => 'required|date',
            'payment_proof' => 'required|file|mimes:pdf,jpg,jpeg,png|max:10240',
        ]);

        $file      = $request->file('payment_proof');
        $safeName  = now()->format('YmdHis') . '_' . $file->getClientOriginalName();
        $path      = $file->storeAs("invoices/{$invoice->id}/proof", $safeName, 'public');

        $invoice->update([
            'status'              => 'payee',
            'paid_by'             => $request->user()->id,
            'paid_at'             => now(),
            'paid_date'           => $data['paid_date'],
            'payment_proof_path'  => $path,
            'payment_proof_name'  => $file->getClientOriginalName(),
        ]);
        $invoice->load('supplier:id,name');

        return response()->json($invoice);
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
        $file     = $request->file('attachment');
        $name     = $file->getClientOriginalName();
        $safeName = now()->format('YmdHis') . '_' . $name;
        $path     = $file->storeAs("invoices/{$invoice->id}", $safeName, 'public');

        $invoice->update(['attachment_path' => $path, 'attachment_name' => $name]);
    }
}
