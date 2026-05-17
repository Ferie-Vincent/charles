<?php

namespace App\Console\Commands;

use App\Models\Invoice;
use App\Models\User;
use App\Notifications\FournisseurInvoiceOverdueNotification;
use App\Support\Roles;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('invoices:check-fournisseur-overdue {--dry-run : List without sending}')]
#[Description('Alert comptable + direction for supplier invoices soumise > 30 days without validation')]
class CheckFournisseurInvoicesOverdue extends Command
{
    public function handle(): int
    {
        $overdueLimit = now()->subDays(30);

        $invoices = Invoice::where('direction', 'fournisseur')
            ->where('status', 'soumise')
            ->where('created_at', '<', $overdueLimit)
            ->with('project')
            ->get();

        if ($invoices->isEmpty()) {
            $this->info('No overdue fournisseur invoices.');
            return Command::SUCCESS;
        }

        $this->info("Found {$invoices->count()} overdue invoice(s).");

        foreach ($invoices as $invoice) {
            $days = (int) $invoice->created_at->diffInDays(now());
            $this->line("  {$invoice->reference} — {$invoice->project?->code} — {$days}j");

            if ($this->option('dry-run')) {
                continue;
            }

            User::whereHas('role', fn($q) => $q->whereIn('name', [
                Roles::COMPTABLE_SLUG,
                Roles::DIRECTEUR_TECHNIQUE_SLUG,
                Roles::DIRECTION_SLUG,
            ]))
                ->where('company_id', $invoice->project?->company_id)
                ->get()
                ->each(fn($u) => $u->notify(new FournisseurInvoiceOverdueNotification($invoice)));
        }

        if (!$this->option('dry-run')) {
            $this->info('Notifications sent.');
        }

        return Command::SUCCESS;
    }
}
