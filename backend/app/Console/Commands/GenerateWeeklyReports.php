<?php

namespace App\Console\Commands;

use App\Models\Project;
use App\Models\ProjectReport;
use App\Services\HealthScoreService;
use App\Services\WhatsAppAlertService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

#[Signature('reports:weekly {--project= : Generate for a specific project ID only}')]
#[Description('Generate weekly PDF reports for all active projects')]
class GenerateWeeklyReports extends Command
{
    public function handle(): int
    {
        $query = Project::where('status', 'active');

        if ($projectId = $this->option('project')) {
            $query->where('id', $projectId);
        }

        $projects = $query->get();
        $weekOf   = now()->startOfWeek()->toDateString();
        $generated = 0;

        foreach ($projects as $project) {
            // Skip if already generated this week
            if (ProjectReport::where('project_id', $project->id)->where('week_of', $weekOf)->exists()) {
                $this->line("  Skipping {$project->code} — already generated for {$weekOf}");
                continue;
            }

            try {
                $pdf      = $this->buildPdf($project);
                $filename = "rapport-{$project->code}-{$weekOf}.pdf";
                $path     = "reports/{$project->id}/{$filename}";

                Storage::disk('local')->put($path, $pdf->output());
                $size = Storage::disk('local')->size($path);

                ProjectReport::create([
                    'project_id' => $project->id,
                    'filename'   => $filename,
                    'path'       => $path,
                    'week_of'    => $weekOf,
                    'size_bytes' => $size,
                    'type'       => 'hebdo',
                ]);

                $this->info("  ✓ {$project->code} → {$filename} ({$size} bytes)");
                $generated++;

                // WhatsApp alert to direction
                $msg = "📋 *Rapport hebdomadaire généré*\n"
                    . "Chantier : {$project->name} ({$project->code})\n"
                    . "Semaine du : " . now()->startOfWeek()->format('d/m/Y') . "\n"
                    . "Fichier : {$filename}";
                app(WhatsAppAlertService::class)->send($msg);
            } catch (\Throwable $e) {
                $this->error("  ✗ {$project->code}: {$e->getMessage()}");
            }
        }

        $this->info("Generated {$generated} report(s).");
        return self::SUCCESS;
    }

    private function buildPdf(Project $project)
    {
        $project->load(['members.user:id,name,email']);

        $logs = $project->dailyLogs()->orderByDesc('log_date')->limit(10)->get();
        $incidents = $project->incidents()->with('reporter:id,name')->orderByDesc('occurred_at')->get();

        $budgetEntries = $project->budgetEntries()->orderBy('entry_date')->get();
        $budgetTotals  = [
            'previsionnel' => $budgetEntries->where('type', 'previsionnel')->sum('amount'),
            'engagement'   => $budgetEntries->where('type', 'engagement')->sum('amount'),
            'paiement'     => $budgetEntries->where('type', 'paiement')->sum('amount'),
        ];
        $budgetTotals['solde'] = $budgetTotals['previsionnel'] - $budgetTotals['paiement'];

        $logMeta = [
            'total'           => $project->dailyLogs()->count(),
            'latest_progress' => $project->dailyLogs()->orderByDesc('log_date')->value('progress_percent') ?? 0,
            'incident_count'  => $project->dailyLogs()->where('has_incident', true)->count(),
        ];

        $healthScore = app(HealthScoreService::class)->compute($project);
        $daysLeft    = $project->end_date
            ? (int) ceil((strtotime($project->end_date) - time()) / 86400)
            : null;

        return Pdf::loadView('pdf.project-report', compact(
            'project', 'logs', 'incidents', 'budgetTotals',
            'budgetEntries', 'logMeta', 'healthScore', 'daysLeft'
        ))->setPaper('a4');
    }
}
