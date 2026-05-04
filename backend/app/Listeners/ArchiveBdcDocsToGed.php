<?php

namespace App\Listeners;

use App\Events\BdcReceived;
use App\Models\GedDocument;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class ArchiveBdcDocsToGed
{
    public function handle(BdcReceived $event): void
    {
        $bdc = $event->bdc;

        if (! $bdc->project_id) {
            return;
        }

        try {
            $this->archiveDeliveryNote($bdc, $event->receiver->id);
            $this->archivePhotos($bdc, $event->receiver->id);
        } catch (\Throwable $e) {
            Log::warning("ArchiveBdcDocsToGed failed for BDC #{$bdc->reference}: {$e->getMessage()}");
        }
    }

    private function archiveDeliveryNote(\App\Models\PurchaseOrder $bdc, int $userId): void
    {
        $path = $bdc->getRawOriginal('delivery_note_path') ?? $bdc->delivery_note_path;

        if (! $path || ! Storage::disk('public')->exists($path)) {
            return;
        }

        $ext      = strtolower(pathinfo($path, PATHINFO_EXTENSION));
        $mimeType = $this->mimeFromExt($ext);
        $size     = Storage::disk('public')->size($path);

        GedDocument::create([
            'company_id'    => $bdc->company_id,
            'project_id'    => $bdc->project_id,
            'uploaded_by'   => $userId,
            'name'          => "BL – BDC #{$bdc->reference}",
            'original_name' => basename($path),
            'path'          => $path,
            'mime_type'     => $mimeType,
            'size_bytes'    => $size,
            'type'          => 'bl',
            'description'   => "Bon de livraison auto-archivé – BDC #{$bdc->reference}",
        ]);
    }

    private function archivePhotos(\App\Models\PurchaseOrder $bdc, int $userId): void
    {
        $photos = $bdc->delivery_photos ?? [];

        foreach ($photos as $index => $path) {
            if (! $path || ! Storage::disk('public')->exists($path)) {
                continue;
            }

            $ext      = strtolower(pathinfo($path, PATHINFO_EXTENSION));
            $mimeType = $this->mimeFromExt($ext);
            $size     = Storage::disk('public')->size($path);
            $num      = $index + 1;

            GedDocument::create([
                'company_id'    => $bdc->company_id,
                'project_id'    => $bdc->project_id,
                'uploaded_by'   => $userId,
                'name'          => "Photo réception #{$num} – BDC {$bdc->reference}",
                'original_name' => basename($path),
                'path'          => $path,
                'mime_type'     => $mimeType,
                'size_bytes'    => $size,
                'type'          => 'photo',
                'description'   => "Photo réception auto-archivée – BDC #{$bdc->reference}",
            ]);
        }
    }

    private function mimeFromExt(string $ext): string
    {
        return match ($ext) {
            'pdf'        => 'application/pdf',
            'jpg', 'jpeg' => 'image/jpeg',
            'png'        => 'image/png',
            'webp'       => 'image/webp',
            default      => 'application/octet-stream',
        };
    }
}
