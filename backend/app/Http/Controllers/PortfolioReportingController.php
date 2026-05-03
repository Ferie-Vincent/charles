<?php

namespace App\Http\Controllers;

use App\Models\ProjectReport;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PortfolioReportingController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        abort_unless(
            in_array($request->user()->role->name, ['direction', 'directeur-technique']),
            403,
            'Accès réservé à la direction.'
        );

        $companyId = $request->user()->company_id;

        $reports = ProjectReport::query()
            ->with(['project:id,name,code'])
            ->whereHas('project', fn ($q) => $q->where('company_id', $companyId))
            ->orderByDesc('created_at')
            ->limit(100)
            ->get();

        $total               = $reports->count();
        $hebdoCount          = $reports->where('type', 'hebdo')->count();
        $manuelCount         = $reports->where('type', 'manuel')->count();
        $projectsWithReports = $reports->pluck('project_id')->unique()->count();

        $items = $reports->map(fn (ProjectReport $r) => [
            'id'           => $r->id,
            'project_id'   => $r->project_id,
            'project_name' => $r->project?->name,
            'project_code' => $r->project?->code,
            'filename'     => $r->filename,
            'week_of'      => $r->week_of->format('Y-m-d'),
            'size_bytes'   => $r->size_bytes,
            'type'         => $r->type,
            'created_at'   => $r->created_at,
        ]);

        return response()->json([
            'stats' => [
                'total_reports'        => $total,
                'hebdo_count'          => $hebdoCount,
                'manuel_count'         => $manuelCount,
                'projects_with_reports' => $projectsWithReports,
            ],
            'reports' => $items->values(),
        ]);
    }
}
