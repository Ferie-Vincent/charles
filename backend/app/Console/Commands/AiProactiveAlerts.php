<?php

namespace App\Console\Commands;

use App\Models\ProjectSnapshot;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Notification;
use App\Notifications\AiAlertNotification;

class AiProactiveAlerts extends Command
{
    protected $signature = 'ai:proactive-alerts';
    protected $description = 'Envoie des alertes proactives pilotées par IA : journaux manquants, dépassement budget, retards planning';

    public function handle(): int
    {
        $today     = today()->toDateString();
        $yesterday = today()->subDay()->toDateString();

        $snapshots = ProjectSnapshot::where('snapshot_date', $today)
            ->orWhere('snapshot_date', $yesterday)
            ->get()
            ->groupBy('project_id')
            ->map(fn($g) => $g->sortByDesc('snapshot_date')->first());

        $alerts = [];

        foreach ($snapshots as $snap) {
            // Journal manquant depuis > 2 jours
            if ($snap->last_log_date) {
                $daysSince = Carbon::parse($snap->last_log_date)->diffInDays(today());
                if ($daysSince > 2) {
                    $alerts[] = [
                        'project_id'   => $snap->project_id,
                        'company_id'   => $snap->company_id,
                        'project_name' => $snap->project_name,
                        'type'         => 'journal_manquant',
                        'message'      => "Aucun journal depuis {$daysSince} jours sur le chantier « {$snap->project_name} ».",
                        'severity'     => 'warning',
                    ];
                }
            }

            // Budget > 80%
            if ($snap->budget_consumption_pct >= 80 && $snap->budget_consumption_pct < 100) {
                $alerts[] = [
                    'project_id'   => $snap->project_id,
                    'company_id'   => $snap->company_id,
                    'project_name' => $snap->project_name,
                    'type'         => 'budget_alerte',
                    'message'      => "Budget consommé à {$snap->budget_consumption_pct}% sur « {$snap->project_name} ».",
                    'severity'     => 'warning',
                ];
            }

            if ($snap->budget_consumption_pct >= 100) {
                $alerts[] = [
                    'project_id'   => $snap->project_id,
                    'company_id'   => $snap->company_id,
                    'project_name' => $snap->project_name,
                    'type'         => 'budget_depasse',
                    'message'      => "Budget DÉPASSÉ ({$snap->budget_consumption_pct}%) sur « {$snap->project_name} ».",
                    'severity'     => 'critical',
                ];
            }

            // Retard planning > 10%
            $delay = $snap->theoretical_progress - $snap->progress_percent;
            if ($delay > 10) {
                $alerts[] = [
                    'project_id'   => $snap->project_id,
                    'company_id'   => $snap->company_id,
                    'project_name' => $snap->project_name,
                    'type'         => 'retard_planning',
                    'message'      => "Retard planning de {$delay}pts sur « {$snap->project_name} » ({$snap->progress_percent}% vs {$snap->theoretical_progress}% théorique).",
                    'severity'     => 'warning',
                ];
            }

            // Incident critique
            if ($snap->incidents_critiques > 0) {
                $alerts[] = [
                    'project_id'   => $snap->project_id,
                    'company_id'   => $snap->company_id,
                    'project_name' => $snap->project_name,
                    'type'         => 'incident_critique',
                    'message'      => "{$snap->incidents_critiques} incident(s) critique(s) non résolu(s) sur « {$snap->project_name} ».",
                    'severity'     => 'critical',
                ];
            }
        }

        if (empty($alerts)) {
            $this->info('Aucune alerte IA à envoyer.');
            return self::SUCCESS;
        }

        // Enregistrer les alertes en tant que notifications DB pour les utilisateurs Direction/DT
        foreach ($alerts as $alert) {
            $recipients = User::where('company_id', $alert['company_id'])
                ->whereHas('role', fn($q) => $q->whereIn('name', ['direction', 'directeur-technique']))
                ->get();

            foreach ($recipients as $user) {
                $user->notify(new AiAlertNotification($alert));
            }
        }

        $this->info('Alertes IA envoyées: ' . count($alerts));
        return self::SUCCESS;
    }
}
