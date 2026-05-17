<?php

namespace App\Console\Commands;

use App\Models\Project;
use App\Models\User;
use App\Notifications\AvancementRetardNotification;
use App\Support\Roles;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

#[Signature('projects:check-avancement-retard {--dry-run : List without sending}')]
#[Description('Alert CDT + direction when real progress lags theoretical by > 10 points')]
class CheckAvancementRetard extends Command
{
    public function handle(): int
    {
        $now = now();

        // Cooldown: skip projects already notified with this type in the last 7 days
        $recentProjectIds = $this->recentlyNotifiedProjectIds('avancement_retard');

        $projects = Project::where('status', 'active')
            ->whereNotNull('start_date')
            ->whereNotNull('end_date')
            ->whereNotIn('id', $recentProjectIds)
            ->get();

        $alerted = 0;

        foreach ($projects as $project) {
            $start = \Carbon\Carbon::parse($project->start_date);
            $end   = \Carbon\Carbon::parse($project->end_date);

            $totalDays   = max(1, $start->diffInDays($end));
            $elapsedDays = min($totalDays, $start->diffInDays($now));

            $avancementCible = round($elapsedDays / $totalDays * 100, 1);

            // Use latest journal progress — NOT target_progress (which is manually set and may be stale)
            $avancementReel = (float) $project->dailyLogs()->latest('log_date')->value('progress_percent');

            if ($avancementReel === 0.0 && $avancementCible === 0.0) {
                continue;
            }

            $ecart = $avancementCible - $avancementReel;

            if ($ecart <= 10) {
                continue;
            }

            $this->line("  {$project->code} — cible {$avancementCible}% / réel (journal) {$avancementReel}% — écart {$ecart} pts");
            $alerted++;

            if ($this->option('dry-run')) {
                continue;
            }

            User::whereHas('role', fn($q) => $q->whereIn('name', [
                Roles::CONDUCTEUR_TRAVAUX_SLUG,
                Roles::DIRECTEUR_TECHNIQUE_SLUG,
                Roles::DIRECTION_SLUG,
            ]))
                ->where('company_id', $project->company_id)
                ->get()
                ->each(fn($u) => $u->notify(
                    new AvancementRetardNotification($project, $avancementReel, $avancementCible, $ecart)
                ));
        }

        $this->info("Done. {$alerted} project(s) in retard.");
        return Command::SUCCESS;
    }

    private function recentlyNotifiedProjectIds(string $type): array
    {
        return DB::table('notifications')
            ->where('created_at', '>', now()->subDays(7))
            ->get(['data'])
            ->map(fn($n) => json_decode($n->data, true))
            ->filter(fn($d) => ($d['type'] ?? '') === $type && isset($d['project_id']))
            ->pluck('project_id')
            ->unique()
            ->map(fn($id) => (int) $id)
            ->values()
            ->toArray();
    }
}
