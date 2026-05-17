<?php

namespace App\Console\Commands;

use App\Models\SituationTravaux;
use App\Models\User;
use App\Notifications\PaymentOverdueNotification;
use App\Support\Roles;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('situations:check-payment-overdue {--dry-run : List overdue without sending notifications}')]
#[Description('Notify DT + comptable for situations validée MOE since > 30 days without payment')]
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
            $this->info('No overdue situations found.');
            return Command::SUCCESS;
        }

        $this->info("Found {$situations->count()} overdue situation(s).");

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
            $this->info('Notifications sent.');
        }

        return Command::SUCCESS;
    }
}
