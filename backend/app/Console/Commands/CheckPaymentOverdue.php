<?php

namespace App\Console\Commands;

use App\Models\SituationTravaux;
use App\Models\User;
use App\Notifications\PaymentOverdueNotification;
use App\Support\Roles;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('situations:check-payment-overdue {--dry-run : Lister les situations en retard sans envoyer de notifications}')]
#[Description('Notifie DT + comptable pour les situations validées MOE depuis > 30 jours sans paiement')]
class CheckPaymentOverdue extends Command
{
    public function handle(): int
    {
        $overdueLimit = now()->subDays(30);

        $situations = SituationTravaux::where('status', 'validee_moe')
            ->where('validated_at', '<', $overdueLimit)
            ->with('project')
            ->get();

        if ($situations->isEmpty()) {
            $this->info('Aucune situation en retard de paiement trouvée.');
            return Command::SUCCESS;
        }

        $this->info("Trouvé {$situations->count()} situation(s) en retard de paiement.");

        foreach ($situations as $situation) {
            $project = $situation->project;
            $days    = (int) $situation->validated_at->diffInDays(now());

            $this->line("  {$situation->numero} — {$project->code} — {$days}j");

            if ($this->option('dry-run')) continue;

            User::whereHas('role', fn($q) => $q->whereIn('name', [
                Roles::DIRECTEUR_TECHNIQUE_SLUG,
                Roles::COMPTABLE_SLUG,
            ]))
                ->where('company_id', $project->company_id)
                ->get()
                ->each(fn($u) => $u->notify(new PaymentOverdueNotification($situation)));
        }

        if (!$this->option('dry-run')) {
            $this->info('Notifications envoyées.');
        }

        return Command::SUCCESS;
    }
}
