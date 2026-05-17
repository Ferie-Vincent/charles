<?php

namespace App\Console\Commands;

use App\Models\Invoice;
use App\Models\User;
use App\Notifications\FournisseurInvoiceOverdueNotification;
use App\Support\Roles;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

#[Signature('invoices:check-fournisseur-overdue {--dry-run : Lister sans envoyer}')]
#[Description('Alerte comptable + direction pour les factures fournisseur soumises depuis > 30 jours sans validation')]
class CheckFournisseurInvoicesOverdue extends Command
{
    public function handle(): int
    {
        $overdueLimit = now()->subDays(30);

        // Anti-doublon 7 jours : ignorer les factures dont le projet a déjà été notifié cette semaine
        $recentProjectIds = DB::table('notifications')
            ->where('created_at', '>', now()->subDays(7))
            ->get(['data'])
            ->map(fn($n) => json_decode($n->data, true))
            ->filter(fn($d) => ($d['type'] ?? '') === 'fournisseur_invoice_overdue' && isset($d['project_id']))
            ->pluck('project_id')
            ->unique()
            ->map(fn($id) => (int) $id)
            ->values()
            ->toArray();

        $invoices = Invoice::where('direction', 'fournisseur')
            ->where('status', 'soumise')
            ->where('created_at', '<', $overdueLimit)
            ->whereHas('project', fn($q) => $q->whereNotIn('id', $recentProjectIds))
            ->with('project')
            ->get();

        if ($invoices->isEmpty()) {
            $this->info('Aucune facture fournisseur en retard.');
            return Command::SUCCESS;
        }

        $this->info("Trouvé {$invoices->count()} facture(s) en retard.");

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
            $this->info('Notifications envoyées.');
        }

        return Command::SUCCESS;
    }
}
