<?php

namespace App\Console\Commands;

use App\Models\SituationTravaux;
use App\Models\User;
use App\Notifications\SituationPendingDtReviewNotification;
use App\Support\Roles;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('situations:check-contestation-delay {--dry-run : List delayed situations without sending notifications}')]
#[Description('Alert DT when a situation has been soumise (awaiting MOE response) for more than 30 days')]
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
            $this->info('No delayed situations found.');
            return Command::SUCCESS;
        }

        $this->info("Found {$situations->count()} situation(s) awaiting MOE response > 30 days.");

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
            $this->info('Notifications sent.');
        }

        return Command::SUCCESS;
    }
}
