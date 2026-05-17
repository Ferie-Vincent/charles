<?php

namespace App\Console\Commands;

use App\Models\Project;
use App\Models\User;
use App\Notifications\AvancementRetardNotification;
use App\Support\Roles;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('projects:check-avancement-retard {--dry-run : List without sending}')]
#[Description('Alert CDT + direction when real progress lags theoretical by > 10 points')]
class CheckAvancementRetard extends Command
{
    public function handle(): int
    {
        $now = now();

        $projects = Project::where('status', 'active')
            ->whereNotNull('start_date')
            ->whereNotNull('end_date')
            ->whereNotNull('target_progress')
            ->get();

        $alerted = 0;

        foreach ($projects as $project) {
            $start = $project->start_date instanceof \Carbon\Carbon
                ? $project->start_date
                : \Carbon\Carbon::parse($project->start_date);
            $end   = $project->end_date instanceof \Carbon\Carbon
                ? $project->end_date
                : \Carbon\Carbon::parse($project->end_date);

            $totalDays   = max(1, $start->diffInDays($end));
            $elapsedDays = min($totalDays, $start->diffInDays($now));

            $avancementCible = round($elapsedDays / $totalDays * 100, 1);
            $avancementReel  = (float) ($project->target_progress ?? 0);

            $ecart = $avancementCible - $avancementReel;

            if ($ecart <= 10) {
                continue;
            }

            $this->line("  {$project->code} — cible {$avancementCible}% / réel {$avancementReel}% — écart {$ecart} pts");
            $alerted++;

            if ($this->option('dry-run')) {
                continue;
            }

            $toNotify = User::whereHas('role', fn($q) => $q->whereIn('name', [
                Roles::CONDUCTEUR_TRAVAUX_SLUG,
                Roles::DIRECTEUR_TECHNIQUE_SLUG,
                Roles::DIRECTION_SLUG,
            ]))
                ->where('company_id', $project->company_id)
                ->get();

            $toNotify->each(fn($u) => $u->notify(
                new AvancementRetardNotification($project, $avancementReel, $avancementCible, $ecart)
            ));
        }

        $this->info("Done. {$alerted} project(s) in retard.");
        return Command::SUCCESS;
    }
}
