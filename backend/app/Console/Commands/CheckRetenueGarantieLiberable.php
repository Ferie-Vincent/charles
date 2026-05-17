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

#[Signature('projects:check-retenue-liberable {--dry-run : Lister sans envoyer}')]
#[Description('Alerte direction + comptable quand la retenue de garantie est libérable (1 an après la réception provisoire)')]
class CheckRetenueGarantieLiberable extends Command
{
    public function handle(): int
    {
        // Anti-doublon 30 jours : la libération de retenue est un événement unique par projet
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

        // Projets dont la réception provisoire remonte à exactement 1 an (fenêtre ±7 jours)
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
