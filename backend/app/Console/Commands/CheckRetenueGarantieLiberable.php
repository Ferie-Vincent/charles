<?php

namespace App\Console\Commands;

use App\Models\Project;
use App\Models\SituationTravaux;
use App\Models\User;
use App\Notifications\RetenueGarantieLiberable;
use App\Support\Roles;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

#[Signature('projects:check-retenue-liberable {--dry-run : List without sending}')]
#[Description('Alert direction + comptable when retenue de garantie is releasable (1 year after provisional reception)')]
class CheckRetenueGarantieLiberable extends Command
{
    public function handle(): int
    {
        // Cooldown 30 days: retenue libération is a one-time event per project
        $recentProjectIds = DB::table('notifications')
            ->where('created_at', '>', now()->subDays(30))
            ->get(['data'])
            ->map(fn($n) => json_decode($n->data, true))
            ->filter(fn($d) => ($d['type'] ?? '') === 'retenue_garantie_liberable' && isset($d['project_id']))
            ->pluck('project_id')
            ->unique()
            ->map(fn($id) => (int) $id)
            ->values()
            ->toArray();

        // Projects whose provisional reception was exactly 1 year ago (±7 day window)
        $projects = Project::whereNotNull('date_reception_provisoire')
            ->whereBetween('date_reception_provisoire', [
                now()->subYear()->subDays(7),
                now()->subYear()->addDays(7),
            ])
            ->where('status', '!=', 'annule')
            ->whereNotIn('id', $recentProjectIds)
            ->get();

        $alerted = 0;

        foreach ($projects as $project) {
            $montant = (float) SituationTravaux::where('project_id', $project->id)
                ->where('status', 'payee')
                ->sum('retenue_garantie_amount');

            if ($montant <= 0) {
                continue;
            }

            $dateReception = $project->date_reception_provisoire->format('d/m/Y');
            $this->line("  {$project->code} — retenue {$montant} XOF — réception {$dateReception}");
            $alerted++;

            if ($this->option('dry-run')) {
                continue;
            }

            User::whereHas('role', fn($q) => $q->whereIn('name', [
                Roles::DIRECTION_SLUG,
                Roles::DIRECTEUR_TECHNIQUE_SLUG,
                Roles::COMPTABLE_SLUG,
            ]))
                ->where('company_id', $project->company_id)
                ->get()
                ->each(fn($u) => $u->notify(new RetenueGarantieLiberable($project, $montant, $dateReception)));
        }

        $this->info("Done. {$alerted} project(s) with retenue libérable.");
        return Command::SUCCESS;
    }
}
