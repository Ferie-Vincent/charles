<?php

namespace App\Listeners;

use App\Events\InvoicePaid;
use App\Models\GedDocument;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class ArchiveInvoiceProofToGed
{
    public function handle(InvoicePaid $event): void
    {
        $invoice = $event->invoice;
        $project = $invoice->project;

        if (! $project) {
            return;
        }

        // Access hidden attribute directly (only hidden from JSON serialization).
        $path = $invoice->getRawOriginal('payment_proof_path') ?? $invoice->payment_proof_path;

        if (! $path) {
            return;
        }

        try {
            if (! Storage::disk('public')->exists($path)) {
                return;
            }

            $ext      = strtolower(pathinfo($path, PATHINFO_EXTENSION));
            $mimeType = match ($ext) {
                'pdf'         => 'application/pdf',
                'jpg', 'jpeg' => 'image/jpeg',
                'png'         => 'image/png',
                default       => 'application/octet-stream',
            };

            GedDocument::create([
                'company_id'    => $project->company_id,
                'project_id'    => $invoice->project_id,
                'uploaded_by'   => $event->payer->id,
                'name'          => "Preuve paiement – Facture #{$invoice->reference}",
                'original_name' => $invoice->payment_proof_name ?? basename($path),
                'path'          => $path,
                'mime_type'     => $mimeType,
                'size_bytes'    => Storage::disk('public')->size($path),
                'type'          => 'facture',
                'description'   => "Preuve de paiement auto-archivée – facture #{$invoice->reference}",
            ]);
        } catch (\Throwable $e) {
            Log::warning("ArchiveInvoiceProofToGed failed for invoice #{$invoice->reference}: {$e->getMessage()}");
        }
    }
}
