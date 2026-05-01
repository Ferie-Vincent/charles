<?php

namespace App\Http\Controllers;

use App\Models\DqeVersion;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PortfolioDqeController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $companyId = $request->user()->company_id;

        $versions = DqeVersion::query()
            ->whereHas('project', fn ($q) => $q->where('company_id', $companyId))
            ->with('project:id,name,code,status')
            ->withCount('lines')
            ->orderByDesc('updated_at')
            ->get()
            ->map(fn ($v) => [
                'id'             => $v->id,
                'project_id'     => $v->project_id,
                'project_name'   => $v->project->name,
                'project_code'   => $v->project->code,
                'project_status' => $v->project->status,
                'version_number' => $v->version_number,
                'name'           => $v->name,
                'status'         => $v->status,
                'total_ht'       => $v->total_ht,
                'lines_count'    => $v->lines_count,
                'updated_at'     => $v->updated_at,
            ]);

        return response()->json($versions);
    }
}
