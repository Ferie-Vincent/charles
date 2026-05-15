<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Models\ProjectReport;
use App\Services\HealthScoreService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Storage;

class ProjectReportController extends Controller
{
    public function index(Request $request, Project $project): JsonResponse
    {
        $this->authorize('view', $project);

        $reports = $project->reports()
            ->orderByDesc('week_of')
            ->limit(20)
            ->get()
            ->map(fn($r) => [
                'id'         => $r->id,
                'filename'   => $r->filename,
                'week_of'    => $r->week_of->format('Y-m-d'),
                'size_bytes' => $r->size_bytes,
                'type'       => $r->type,
                'created_at' => $r->created_at,
            ]);

        return response()->json($reports);
    }

    public function download(Request $request, Project $project, ProjectReport $report): Response
    {
        $this->authorize('view', $project);
        abort_if($report->project_id !== $project->id, 404);

        abort_unless(Storage::disk('local')->exists($report->path), 404);

        return response(Storage::disk('local')->get($report->path), 200, [
            'Content-Type'        => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="' . $report->filename . '"',
        ]);
    }

    public function pdf(Request $request, Project $project): Response
    {
        $this->authorize('view', $project);

        $project->load([
            'members.user:id,name,email',
            'activities' => fn($q) => $q->latest()->limit(10),
        ]);

        $logs = $project->dailyLogs()
            ->orderByDesc('log_date')
            ->limit(10)
            ->get();

        $incidents = $project->incidents()
            ->with('reporter:id,name')
            ->orderByDesc('occurred_at')
            ->get();

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

        $daysLeft = $project->end_date
            ? (int) ceil((strtotime($project->end_date) - time()) / 86400)
            : null;

        $pdf = Pdf::loadView('pdf.project-report', compact(
            'project', 'logs', 'incidents', 'budgetTotals',
            'budgetEntries', 'logMeta', 'healthScore', 'daysLeft'
        ))->setPaper('a4');

        $filename = 'rapport-' . $project->code . '-' . now()->format('Ymd') . '.pdf';

        return $pdf->download($filename);
    }
}
