<?php

namespace App\Http\Controllers;

use App\Models\DqeVersion;
use App\Models\Invoice;
use App\Models\Project;
use App\Models\PurchaseOrder;
use App\Models\StockItem;
use App\Services\ProjectMetricsService;
use App\Support\Roles;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PortfolioOperationsController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        abort_unless(
            in_array($request->user()->role->name, Roles::MANAGEMENT),
            403,
            'Accès réservé à la direction.'
        );

        $companyId = $request->user()->company_id;
        $svc       = new ProjectMetricsService();

        $projects = Project::query()
            ->where('company_id', $companyId)
            ->where('status', 'active')
            ->with(['dailyLogs', 'budgetEntries', 'invoices', 'dqeVersions'])
            ->get();

        $healthData = $projects->map(fn (Project $p) => [
            'id'           => $p->id,
            'name'         => $p->name,
            'code'         => $p->code,
            'health_score' => ($h = $svc->compute($p))['score'],
            'health_label' => $h['label'],
        ]);

        $avgScore     = $healthData->avg('health_score') ?? 0;
        $criticalProj = $healthData->filter(fn ($h) => $h['health_score'] < 50)->values();

        $bdcPending = PurchaseOrder::query()
            ->where('company_id', $companyId)
            ->where('status', 'soumis')
            ->with('supplier:id,name', 'project:id,name,code')
            ->orderBy('created_at')
            ->get()
            ->map(fn (PurchaseOrder $o) => [
                'id'           => $o->id,
                'reference'    => $o->reference,
                'supplier'     => $o->supplier?->name ?? '—',
                'total_amount' => $o->total_amount,
                'age_days'     => (int) $o->created_at->diffInDays(now()),
                'project'      => $o->project
                    ? ['id' => $o->project->id, 'name' => $o->project->name, 'code' => $o->project->code]
                    : null,
            ]);

        $stockAlerts = StockItem::query()
            ->where('company_id', $companyId)
            ->where('threshold', '>', 0)
            ->whereColumn('quantity', '<=', 'threshold')
            ->get(['id', 'name', 'unit', 'quantity', 'threshold'])
            ->map(fn (StockItem $s) => [
                'id'        => $s->id,
                'name'      => $s->name,
                'unit'      => $s->unit,
                'quantity'  => $s->quantity,
                'threshold' => $s->threshold,
                'deficit'   => max(0, $s->threshold - $s->quantity),
            ]);

        $dqePending = DqeVersion::query()
            ->where('status', 'soumise')
            ->whereHas('project', fn ($q) => $q->where('company_id', $companyId))
            ->with('project:id,name,code')
            ->orderBy('updated_at')
            ->get()
            ->map(fn (DqeVersion $dqe) => [
                'id'             => $dqe->id,
                'name'           => $dqe->name,
                'version_number' => $dqe->version_number,
                'total_ht'       => $dqe->total_ht,
                'age_days'       => (int) $dqe->updated_at->diffInDays(now()),
                'project_id'     => $dqe->project_id,
                'project_name'   => $dqe->project?->name ?? '—',
                'project_code'   => $dqe->project?->code ?? '—',
            ]);

        $invoicesPending = Invoice::query()
            ->where('status', 'soumise')
            ->whereHas('project', fn ($q) => $q->where('company_id', $companyId))
            ->with('project:id,name,code', 'supplier:id,name')
            ->orderBy('created_at')
            ->get()
            ->map(fn (Invoice $inv) => [
                'id'           => $inv->id,
                'reference'    => $inv->reference,
                'amount_ht'    => $inv->amount_ht,
                'supplier'     => $inv->supplier?->name ?? '—',
                'age_days'     => (int) $inv->created_at->diffInDays(now()),
                'project_id'   => $inv->project_id,
                'project_name' => $inv->project?->name ?? '—',
                'project_code' => $inv->project?->code ?? '—',
            ]);

        return response()->json([
            'health_summary'    => [
                'avg_score'      => (int) round($avgScore),
                'critical_count' => $criticalProj->count(),
                'total_active'   => $projects->count(),
            ],
            'budget_summary'    => $this->budgetSummary($projects),
            'bdc_pending'       => $bdcPending->values(),
            'stock_alerts'      => $stockAlerts->values(),
            'critical_projects' => $criticalProj->values(),
            'invoices_pending'  => $invoicesPending->values(),
            'dqe_pending'       => $dqePending->values(),
        ]);
    }

    private function budgetSummary($projects): array
    {
        $previsionnel = 0.0;
        $engage       = 0.0;
        $realise      = 0.0;

        foreach ($projects as $project) {
            $lastDqe   = $project->dqeVersions->where('status', 'validated')->sortByDesc('version_number')->first();
            $dqeTotal  = $lastDqe ? (float) $lastDqe->total_ht : 0.0;
            $budgetRef    = $dqeTotal > 0 ? $dqeTotal : (float) $project->budget_amount;
            $previsionnel += $budgetRef;
            $engage       += (float) $project->budgetEntries->where('type', 'engagement')->sum('amount')
                           + (float) $project->invoices->where('status', 'validee')->sum('amount_ht');
            $realise      += (float) $project->invoices->where('status', 'payee')->sum('amount_ht');
        }

        return [
            'previsionnel' => $previsionnel,
            'engage'       => $engage,
            'realise'      => $realise,
            'tauxEngage'   => $previsionnel > 0 ? round($engage / $previsionnel * 100, 1) : 0,
            'tauxRealise'  => $previsionnel > 0 ? round($realise / $previsionnel * 100, 1) : 0,
        ];
    }
}
