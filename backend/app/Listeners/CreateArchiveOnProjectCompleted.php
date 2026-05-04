<?php

namespace App\Listeners;

use App\Events\ProjectCompleted;
use App\Models\ProjectActivity;
use Illuminate\Support\Facades\Log;

class CreateArchiveOnProjectCompleted
{
    public function handle(ProjectCompleted $event): void
    {
        $project = $event->project;

        try {
            $stats = [
                'dqe_valides'    => $project->dqeVersions()->where('status', 'validated')->count(),
                'journaux'       => $project->dailyLogs()->count(),
                'incidents'      => $project->incidents()->count(),
                'incidents_open' => $project->incidents()->whereIn('status', ['ouvert', 'en_cours'])->count(),
                'factures'       => $project->invoices()->count(),
                'factures_total' => (float) $project->invoices()->whereIn('status', ['validee', 'payee'])->sum('amount_ht'),
                'bdc_count'      => \App\Models\PurchaseOrder::where('project_id', $project->id)->count(),
                'progress_final' => $project->current_progress ?? 0,
            ];

            $totalFmt = number_format($stats['factures_total'], 0, ',', ' ');

            ProjectActivity::create([
                'project_id'  => $project->id,
                'user_id'     => $event->by->id,
                'type'        => 'projet_complete',
                'description' => "Projet « {$project->name} » clôturé. "
                    . "Avancement final : {$stats['progress_final']}%. "
                    . "Dépenses validées : {$totalFmt} XOF HT. "
                    . ($stats['incidents_open'] > 0
                        ? "⚠ {$stats['incidents_open']} incident(s) encore ouvert(s)."
                        : "Aucun incident ouvert."),
                'metadata' => $stats,
            ]);

            if ($stats['incidents_open'] > 0) {
                Log::warning("ProjectCompleted: projet #{$project->id} clôturé avec {$stats['incidents_open']} incidents ouverts.");
            }
        } catch (\Throwable $e) {
            Log::warning("CreateArchiveOnProjectCompleted failed for project #{$project->id}: {$e->getMessage()}");
        }
    }
}
