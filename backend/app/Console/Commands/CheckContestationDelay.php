<?php

namespace App\Console\Commands;

use App\Models\SituationTravaux;
use App\Models\User;
use App\Notifications\SituationPendingDtReviewNotification;
use App\Support\Roles;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('situations:check-contestation-delay {--dry-run : Lister les situations en retard sans envoyer de notifications}')]
#[Description('Alerte DT quand une situation est soumise (en attente de réponse MOE) depuis plus de 30 jours')]
class CheckContestationDelay extends Command
{
    public function handle(): int
    {
        $delayLimit = now()->subDays(30);

        $situations = SituationTravaux::where('status', 'soumise')
            ->where('submitted_at', '<', $delayLimit)
            ->with('project')
            ->get();

        if ($situations->isEmpty()) {
            $this->info('Aucune situation en retard trouvée.');
            return Command::SUCCESS;
        }

        $this->info("Trouvé {$situations->count()} situation(s) en attente de réponse MOE > 30 jours.");

        foreach ($situations as $situation) {
            $project = $situation->project;
            $days    = (int) $situation->submitted_at->diffInDays(now());

            $this->line("  {$situation->numero} — {$project->code} — soumis depuis {$days}j");

            if ($this->option('dry-run')) continue;

            User::whereHas('role', fn($q) => $q->whereIn('name', Roles::MANAGEMENT))
                ->where('company_id', $project->company_id)
                ->get()
                ->each(fn($u) => $u->notify(new \App\Notifications\ContestationDelayNotification($situation, $days)));
        }

        if (!$this->option('dry-run')) {
            $this->info('Notifications envoyées.');
        }

        return Command::SUCCESS;
    }
}
