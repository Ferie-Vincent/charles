<?php

namespace App\Http\Controllers;

use App\Events\InvoicePaid;
use App\Models\Invoice;
use App\Models\Project;
use App\Services\WorkflowService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
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
        $this->authorize('manageFinances', $project);

        if ($project->status === 'completed') {
            abort_unless(
                in_array($request->user()->role->name, ['direction', 'comptable']),
                403,
                'Chantier terminé — seuls direction et comptable peuvent saisir des régularisations.'
            );
        }

        $data = $request->validate([
            'reference'          => 'required|string|max:100',
            'category'           => 'required|string|max:100',
            'amount_ht'          => 'required|numeric|min:0',
            'vat_rate'           => 'nullable|integer|min:0|max:100',
            'amount_ttc'         => 'nullable|numeric|min:0',
            'status'             => 'required|in:brouillon,soumise',
            'invoice_date'       => 'required|date',
            'due_date'           => 'nullable|date',
            'supplier_id'        => ['nullable', Rule::exists('suppliers', 'id')->where('project_id', $project->id)],
            'purchase_order_id'  => ['nullable', Rule::exists('purchase_orders', 'id')->where('project_id', $project->id)],
            'note'               => 'nullable|string|max:1000',
            'attachment'         => 'nullable|file|mimes:pdf,jpg,jpeg,png|max:10240',
        ]);

        if (! empty($data['purchase_order_id'])) {
            $bdc = \App\Models\PurchaseOrder::find($data['purchase_order_id']);
            if ($bdc) {
                $alreadyInvoiced = Invoice::where('purchase_order_id', $bdc->id)
                    ->whereIn('status', ['soumise', 'validee', 'payee'])
                    ->sum('amount_ht');
                abort_if(
                    $alreadyInvoiced + $data['amount_ht'] > $bdc->total_amount,
                    422,
                    'Montant facturé dépasse le montant du BDC (' . number_format($bdc->total_amount, 0, ',', ' ') . ' XOF HT).'
                );
            }
        }

        $vatRate   = $data['vat_rate'] ?? 18;
        $vatAmount = round($data['amount_ht'] * $vatRate / 100, 2);

        $invoice = DB::transaction(function () use ($request, $project, $data, $vatRate, $vatAmount) {
            $inv = $project->invoices()->create([
                ...collect($data)->except('attachment')->all(),
                'vat_rate'   => $vatRate,
                'vat_amount' => $vatAmount,
                'amount_ttc' => $data['amount_ttc'] ?? round($data['amount_ht'] + $vatAmount, 2),
                'currency'   => 'XOF',
                'created_by' => $request->user()->id,
            ]);

            if ($request->hasFile('attachment')) {
                $this->storeAttachment($request, $inv);
            }

            return $inv;
        });

        $invoice->load('supplier:id,name');

        return response()->json($invoice, 201);
    }

    public function update(Request $request, Project $project, Invoice $invoice): JsonResponse
    {
        $this->authorize('manageFinances', $project);
        abort_if($invoice->project_id !== $project->id, 404);
        abort_if($invoice->status === 'payee', 422, 'Une facture payée ne peut pas être modifiée.');
        abort_if($invoice->status === 'disputee', 422, 'Une facture en litige ne peut pas être modifiée directement. Utilisez la transition.');

        $data = $request->validate([
            'reference'         => 'sometimes|required|string|max:100',
            'category'          => 'sometimes|required|string|max:100',
            'amount_ht'         => 'sometimes|required|numeric|min:0',
            'vat_rate'          => 'nullable|integer|min:0|max:100',
            'amount_ttc'        => 'nullable|numeric|min:0',
            'status'            => 'sometimes|required|in:brouillon,soumise',
            'invoice_date'      => 'sometimes|required|date',
            'due_date'          => 'nullable|date',
            'supplier_id'       => ['nullable', Rule::exists('suppliers', 'id')->where('project_id', $project->id)],
            'purchase_order_id' => ['nullable', Rule::exists('purchase_orders', 'id')->where('project_id', $project->id)],
            'note'              => 'nullable|string|max:1000',
            'attachment'        => 'nullable|file|mimes:pdf,jpg,jpeg,png|max:10240',
        ]);

        if (isset($data['amount_ht']) || isset($data['purchase_order_id'])) {
            $bdcId = $data['purchase_order_id'] ?? $invoice->purchase_order_id;
            if ($bdcId) {
                $bdc = \App\Models\PurchaseOrder::find($bdcId);
                if ($bdc) {
                    $alreadyInvoiced = Invoice::where('purchase_order_id', $bdc->id)
                        ->where('id', '!=', $invoice->id)
                        ->whereIn('status', ['soumise', 'validee', 'payee'])
                        ->sum('amount_ht');
                    $newAmount = $data['amount_ht'] ?? $invoice->amount_ht;
                    abort_if(
                        $alreadyInvoiced + $newAmount > $bdc->total_amount,
                        422,
                        'Montant facturé dépasse le montant du BDC (' . number_format($bdc->total_amount, 0, ',', ' ') . ' XOF HT).'
                    );
                }
            }
        }

        // Recalculate TVA if amount_ht or vat_rate changed
        if (isset($data['amount_ht']) || isset($data['vat_rate'])) {
            $amountHt  = $data['amount_ht'] ?? $invoice->amount_ht;
            $vatRate   = $data['vat_rate'] ?? $invoice->vat_rate ?? 18;
            $vatAmount = round($amountHt * $vatRate / 100, 2);
            $data['vat_rate']   = $vatRate;
            $data['vat_amount'] = $vatAmount;
            if (! isset($data['amount_ttc'])) {
                $data['amount_ttc'] = round($amountHt + $vatAmount, 2);
            }
        }

        $invoice->update(collect($data)->except('attachment')->all());

        if ($request->hasFile('attachment')) {
            $oldPath = $invoice->attachment_path;
            $this->storeAttachment($request, $invoice); // store new first
            if ($oldPath) {
                Storage::disk('public')->delete($oldPath); // delete old only after success
            }
        }

        $invoice->load('supplier:id,name');

        return response()->json($invoice);
    }

    public function destroy(Project $project, Invoice $invoice): Response
    {
        $this->authorize('manageFinances', $project);
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
        $this->authorize('manageFinances', $project);
        abort_if($invoice->project_id !== $project->id, 404);

        $data = $request->validate([
            'status' => 'required|in:soumise,validee,disputee',
        ]);

        try {
            app(WorkflowService::class)->transitionInvoice($invoice, $data['status'], $request->user());
        } catch (\InvalidArgumentException $e) {
            abort(422, $e->getMessage());
        } catch (\RuntimeException $e) {
            abort(403, $e->getMessage());
        }

        $invoice->load('supplier:id,name');

        return response()->json($invoice);
    }

    public function pay(Request $request, Project $project, Invoice $invoice): JsonResponse
    {
        $this->authorize('manageFinances', $project);
        abort_if($invoice->project_id !== $project->id, 404);
        abort_unless(
            $request->user()->role->name === 'comptable',
            403,
            'Paiement réservé au comptable.'
        );
        abort_unless($invoice->status === 'validee', 422, 'Seule une facture validée peut être payée.');
        abort_unless($invoice->attachment_path, 422, 'La facture doit avoir une pièce jointe avant d\'être payée.');
        abort_unless($invoice->purchase_order_id, 422, 'La facture doit être liée à un bon de commande avant d\'être payée.');

        $data = $request->validate([
            'paid_date'     => 'required|date',
            'payment_proof' => 'required|file|mimes:pdf,jpg,jpeg,png|max:10240',
        ]);

        $file      = $request->file('payment_proof');
        $extension = strtolower($file->getClientOriginalExtension());
        $allowedExtensions = ['pdf', 'jpg', 'jpeg', 'png'];
        if (!in_array($extension, $allowedExtensions)) {
            abort(422, 'Type de fichier non autorisé.');
        }
        $safeName  = now()->format('YmdHis') . '_' . Str::uuid() . '.' . $extension;
        $path      = $file->storeAs("invoices/{$invoice->id}/proof", $safeName, 'public');

        $invoice->update([
            'status'              => 'payee',
            'paid_by'             => $request->user()->id,
            'paid_at'             => now(),
            'paid_date'           => $data['paid_date'],
            'payment_proof_path'  => $path,
            'payment_proof_name'  => $file->getClientOriginalName(),
        ]);

        event(new InvoicePaid($invoice->load('project'), $request->user()));

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
        $file      = $request->file('attachment');
        $name      = $file->getClientOriginalName();
        $extension = strtolower($file->getClientOriginalExtension());
        $allowedExtensions = ['pdf', 'jpg', 'jpeg', 'png'];
        if (!in_array($extension, $allowedExtensions)) {
            abort(422, 'Type de fichier non autorisé.');
        }
        $safeName = now()->format('YmdHis') . '_' . Str::uuid() . '.' . $extension;
        $path     = $file->storeAs("invoices/{$invoice->id}", $safeName, 'public');

        $invoice->update(['attachment_path' => $path, 'attachment_name' => $name]);
    }
}
