<?php

namespace App\Notifications;

use App\Models\Invoice;
use Illuminate\Notifications\Notification;

class FournisseurInvoiceOverdueNotification extends Notification
{
    public function __construct(public readonly Invoice $invoice) {}

    public function via(object $notifiable): array { return ['database']; }

    public function toDatabase(object $notifiable): array
    {
        $days = (int) $this->invoice->created_at->diffInDays(now());
        return [
            'type'         => 'fournisseur_invoice_overdue',
            'invoice_id'   => $this->invoice->id,
            'reference'    => $this->invoice->reference,
            'project_id'   => $this->invoice->project_id,
            'project_name' => $this->invoice->project->name ?? null,
            'project_code' => $this->invoice->project->code ?? null,
            'amount_ht'    => $this->invoice->amount_ht,
            'days_pending' => $days,
        ];
    }
}
