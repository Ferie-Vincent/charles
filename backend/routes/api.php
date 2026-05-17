<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\InvoiceController;
use App\Http\Controllers\PermissionsController;
use App\Http\Controllers\ProjectAccountingController;
use App\Http\Controllers\SupplierController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\BudgetController;
use App\Http\Controllers\ProjectReportController;
use App\Http\Controllers\DailyLogController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\HealthScoreController;
use App\Http\Controllers\ProjectController;
use App\Http\Controllers\ProjectIncidentController;
use App\Http\Controllers\ProjectPhotoController;
use App\Http\Controllers\MaterialReceiptController;
use App\Http\Controllers\MeetingReportController;
use App\Http\Controllers\WhatsAppTestController;
use App\Http\Controllers\SafetyScoreController;
use App\Http\Controllers\PortfolioCostsController;
use App\Http\Controllers\PortfolioEvaluationController;
use App\Http\Controllers\PortfolioQhseController;
use App\Http\Controllers\PortfolioReportingController;
use App\Http\Controllers\PortfolioDqeController;
use App\Http\Controllers\DqeVersionController;
use App\Http\Controllers\SituationTravauxController;
use App\Http\Controllers\PortfolioAnalysisController;
use App\Http\Controllers\PortfolioAccountingController;
use App\Http\Controllers\GeneralExpenseController;
use App\Http\Controllers\GlobalSupplierController;
use App\Http\Controllers\StockController;
use App\Http\Controllers\PurchaseOrderController;
use App\Http\Controllers\GedController;
use App\Http\Controllers\DemandeBesoinController;
use App\Http\Controllers\TaskController;
use App\Http\Controllers\PortfolioOperationsController;
use App\Http\Controllers\ProjectWorkerController;
use App\Http\Controllers\AvenantController;
use App\Http\Controllers\OrdreDeServiceController;
use App\Http\Controllers\BpuController;
use App\Http\Controllers\DgdController;
use Illuminate\Support\Facades\Route;

Route::get('/health', function () {
    return response()->json([
        'status' => 'ok',
        'app' => config('app.name'),
        'timestamp' => now()->toIso8601String(),
    ]);
});

Route::prefix('auth')->group(function () {
    Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:5,1');

    Route::middleware('auth')->group(function () {
        Route::get('/me', [AuthController::class, 'me']);
        Route::post('/logout', [AuthController::class, 'logout']);
    });
});

Route::middleware('auth')->group(function () {
    Route::get('/dashboard', [DashboardController::class, 'index']);
    Route::post('/dashboard/alerts/dismiss', [DashboardController::class, 'dismissAlert']);

    Route::get('/tasks', [TaskController::class, 'index']);
    Route::post('/tasks', [TaskController::class, 'store']);
    Route::patch('/tasks/{task}', [TaskController::class, 'update']);
    Route::delete('/tasks/{task}', [TaskController::class, 'destroy']);
    Route::get('/my-permissions', [PermissionsController::class, 'myPermissions']);
    Route::get('/permissions', [PermissionsController::class, 'index']);
    Route::put('/permissions', [PermissionsController::class, 'update']);
    Route::get('/users/roles', [UserController::class, 'roles']);
    Route::get('/users', [UserController::class, 'index']);
    Route::post('/users', [UserController::class, 'store']);
    Route::put('/users/{user}', [UserController::class, 'update']);
    Route::delete('/users/{user}', [UserController::class, 'destroy']);

    // ── Portfolio (costs / accounting) ───────────────────────────────────────
    Route::middleware('permission:costs')->group(function () {
        Route::get('/portfolio/costs', [PortfolioCostsController::class, 'index']);
    });

    Route::middleware('permission:accounting')->group(function () {
        Route::get('/portfolio/accounting', [PortfolioAccountingController::class, 'index']);
        Route::get('/portfolio/accounting/activity/{type}/{id}', [PortfolioAccountingController::class, 'activityDetail']);
        Route::get('/portfolio/operations', [PortfolioOperationsController::class, 'index']);
    });

    // ── Stocks ───────────────────────────────────────────────────────────────
    Route::middleware('permission:stocks')->group(function () {
        Route::get('/stock-movements/adjustments', [StockController::class, 'adjustmentAudit']);
        Route::get('/stock-items', [StockController::class, 'index']);
        Route::post('/stock-items', [StockController::class, 'store']);
        Route::put('/stock-items/{stockItem}', [StockController::class, 'update']);
        Route::delete('/stock-items/{stockItem}', [StockController::class, 'destroy']);
        Route::get('/stock-items/{stockItem}/movements', [StockController::class, 'movements']);
        Route::post('/stock-items/{stockItem}/movements', [StockController::class, 'addMovement']);
    });

    // ── Achats (bons de commande) ─────────────────────────────────────────────
    Route::middleware('permission:achats')->group(function () {
        Route::get('/purchase-orders', [PurchaseOrderController::class, 'index']);
        Route::post('/purchase-orders', [PurchaseOrderController::class, 'store']);
        Route::put('/purchase-orders/{purchaseOrder}', [PurchaseOrderController::class, 'update']);
        Route::delete('/purchase-orders/{purchaseOrder}', [PurchaseOrderController::class, 'destroy']);
        Route::patch('/purchase-orders/{purchaseOrder}/submit', [PurchaseOrderController::class, 'submit']);
        Route::patch('/purchase-orders/{purchaseOrder}/approve', [PurchaseOrderController::class, 'approve']);
        Route::patch('/purchase-orders/{purchaseOrder}/reject', [PurchaseOrderController::class, 'reject']);
        Route::post('/purchase-orders/{purchaseOrder}/resubmit', [PurchaseOrderController::class, 'resubmit']);
        Route::patch('/purchase-orders/{purchaseOrder}/receive', [PurchaseOrderController::class, 'markReceived']);
        Route::get('/purchase-orders/{purchaseOrder}/delivery-docs', [PurchaseOrderController::class, 'deliveryDocs']);
        Route::post('/purchase-orders/{purchaseOrder}/cancel', [PurchaseOrderController::class, 'cancel']);
    });

    // ── Demandes de besoins ───────────────────────────────────────────────────
    Route::middleware('permission:besoins')->group(function () {
        Route::get('/demandes-besoins', [DemandeBesoinController::class, 'index']);
        Route::post('/demandes-besoins', [DemandeBesoinController::class, 'store']);
        Route::patch('/demandes-besoins/{demande}/approve',   [DemandeBesoinController::class, 'approve']);
        Route::patch('/demandes-besoins/{demande}/reject',    [DemandeBesoinController::class, 'reject']);
        Route::patch('/demandes-besoins/{demande}/resubmit',  [DemandeBesoinController::class, 'resubmit']);
        Route::patch('/demandes-besoins/{demande}/prepare',   [DemandeBesoinController::class, 'prepare']);
        Route::patch('/demandes-besoins/{demande}/deliver',   [DemandeBesoinController::class, 'deliver']);
        Route::patch('/demandes-besoins/{demande}/record',    [DemandeBesoinController::class, 'record']);
    });

    // ── GED ──────────────────────────────────────────────────────────────────
    Route::middleware('permission:ged')->group(function () {
        Route::get('/ged', [GedController::class, 'index']);
        Route::post('/ged', [GedController::class, 'store']);
        Route::get('/ged/{gedDocument}/url', [GedController::class, 'url']);
        Route::get('/ged/{gedDocument}/download', [GedController::class, 'download']);
        Route::put('/ged/{gedDocument}', [GedController::class, 'update']);
        Route::delete('/ged/{gedDocument}', [GedController::class, 'destroy']);
    });

    // ── Fournisseurs globaux ──────────────────────────────────────────────────
    Route::middleware('permission:suppliers')->group(function () {
        Route::get('/suppliers', [GlobalSupplierController::class, 'index']);
        Route::post('/suppliers', [GlobalSupplierController::class, 'store']);
        Route::get('/suppliers/{supplier}', [GlobalSupplierController::class, 'show']);
        Route::put('/suppliers/{supplier}', [GlobalSupplierController::class, 'update']);
        Route::delete('/suppliers/{supplier}', [GlobalSupplierController::class, 'destroy']);
    });

    // ── Dépenses générales ────────────────────────────────────────────────────
    Route::middleware('permission:accounting')->group(function () {
        Route::get('/expenses', [GeneralExpenseController::class, 'index']);
        Route::post('/expenses', [GeneralExpenseController::class, 'store']);
        Route::put('/expenses/{generalExpense}', [GeneralExpenseController::class, 'update']);
        Route::delete('/expenses/{generalExpense}', [GeneralExpenseController::class, 'destroy']);
        Route::patch('/expenses/{generalExpense}/approve', [GeneralExpenseController::class, 'approve']);
        Route::patch('/expenses/{generalExpense}/reject', [GeneralExpenseController::class, 'reject']);
    });

    // ── Portfolio vues analytiques ────────────────────────────────────────────
    Route::get('/portfolio/evaluation', [PortfolioEvaluationController::class, 'index']);
    Route::middleware('permission:qse')->group(function () {
        Route::get('/portfolio/qhse', [PortfolioQhseController::class, 'index']);
    });
    Route::get('/portfolio/reports', [PortfolioReportingController::class, 'index']);
    Route::middleware('permission:dqe')->group(function () {
        Route::get('/portfolio/dqe', [PortfolioDqeController::class, 'index']);
    });
    Route::post('/portfolio/ai-analysis', [PortfolioAnalysisController::class, 'generate'])->middleware('throttle:10,60');

    // ── Projets (CRUD + sous-ressources) ─────────────────────────────────────
    Route::get('/projects', [ProjectController::class, 'index']);
    Route::post('/projects', [ProjectController::class, 'store']);
    Route::get('/projects/{project}', [ProjectController::class, 'show']);
    Route::put('/projects/{project}', [ProjectController::class, 'update']);
    Route::delete('/projects/{project}', [ProjectController::class, 'destroy']);

    Route::get('/projects/{project}/daily-logs', [DailyLogController::class, 'index']);
    Route::post('/projects/{project}/daily-logs', [DailyLogController::class, 'store']);
    Route::patch('/projects/{project}/daily-logs/{dailyLog}', [DailyLogController::class, 'update']);
    Route::delete('/projects/{project}/daily-logs/{dailyLog}', [DailyLogController::class, 'destroy']);

    Route::get('/projects/{project}/health-score', [HealthScoreController::class, 'show']);
    Route::get('/projects/{project}/safety-score', [SafetyScoreController::class, 'show']);
    Route::get('/projects/{project}/material-receipts', [MaterialReceiptController::class, 'index']);
    Route::post('/projects/{project}/meeting-report', [MeetingReportController::class, 'generate'])->middleware('throttle:10,60');
    Route::post('/projects/{project}/whatsapp/test', [WhatsAppTestController::class, 'test']);

    Route::get('/projects/{project}/photos', [ProjectPhotoController::class, 'index']);
    Route::post('/projects/{project}/photos', [ProjectPhotoController::class, 'store']);
    Route::delete('/projects/{project}/photos/{photo}', [ProjectPhotoController::class, 'destroy']);

    Route::middleware('permission:qse')->group(function () {
        Route::get('/projects/{project}/incidents', [ProjectIncidentController::class, 'index']);
        Route::post('/projects/{project}/incidents', [ProjectIncidentController::class, 'store']);
        Route::patch('/projects/{project}/incidents/{incident}', [ProjectIncidentController::class, 'update']);
        Route::delete('/projects/{project}/incidents/{incident}', [ProjectIncidentController::class, 'destroy']);
        Route::get('/projects/{project}/incidents/{incident}/pdf', [ProjectIncidentController::class, 'pdf']);
    });

    Route::middleware('permission:accounting')->group(function () {
        Route::get('/projects/{project}/accounting', [ProjectAccountingController::class, 'show']);
        Route::get('/projects/{project}/suppliers', [SupplierController::class, 'index']);
        Route::post('/projects/{project}/suppliers', [SupplierController::class, 'store']);
        Route::put('/projects/{project}/suppliers/{supplier}', [SupplierController::class, 'update']);
        Route::delete('/projects/{project}/suppliers/{supplier}', [SupplierController::class, 'destroy']);
        Route::get('/projects/{project}/invoices', [InvoiceController::class, 'index']);
        Route::post('/projects/{project}/invoices', [InvoiceController::class, 'store']);
        Route::put('/projects/{project}/invoices/{invoice}', [InvoiceController::class, 'update']);
        Route::delete('/projects/{project}/invoices/{invoice}', [InvoiceController::class, 'destroy']);
        Route::patch('/projects/{project}/invoices/{invoice}/transition', [InvoiceController::class, 'transition']);
        Route::post('/projects/{project}/invoices/{invoice}/pay', [InvoiceController::class, 'pay']);
        Route::get('/projects/{project}/invoices/{invoice}/attachment', [InvoiceController::class, 'downloadAttachment']);
    });

    Route::middleware('permission:costs')->group(function () {
        Route::get('/projects/{project}/budget', [BudgetController::class, 'index']);
        Route::post('/projects/{project}/budget/entries', [BudgetController::class, 'store']);
        Route::delete('/projects/{project}/budget/entries/{budgetEntry}', [BudgetController::class, 'destroy']);
    });

    Route::get('/projects/{project}/report/pdf', [ProjectReportController::class, 'pdf']);
    Route::get('/projects/{project}/reports', [ProjectReportController::class, 'index']);
    Route::get('/projects/{project}/reports/{report}/download', [ProjectReportController::class, 'download']);

    // ── Personnel chantier ───────────────────────────────────────────────────
    Route::get('/projects/{project}/workers', [ProjectWorkerController::class, 'index']);
    Route::post('/projects/{project}/workers', [ProjectWorkerController::class, 'store']);
    Route::patch('/projects/{project}/workers/{worker}', [ProjectWorkerController::class, 'update']);
    Route::delete('/projects/{project}/workers/{worker}', [ProjectWorkerController::class, 'destroy']);
    Route::post('/projects/{project}/workers/attendance', [ProjectWorkerController::class, 'attendance']);
    Route::get('/projects/{project}/workers/export', [ProjectWorkerController::class, 'export']);

    // ── Avenants ─────────────────────────────────────────────────────────────
    Route::get('/projects/{project}/avenants', [AvenantController::class, 'index']);
    Route::post('/projects/{project}/avenants', [AvenantController::class, 'store']);
    Route::put('/projects/{project}/avenants/{avenant}', [AvenantController::class, 'update']);
    Route::delete('/projects/{project}/avenants/{avenant}', [AvenantController::class, 'destroy']);

    // ── Ordres de Service ─────────────────────────────────────────────────────
    Route::get('/projects/{project}/os', [OrdreDeServiceController::class, 'index']);
    Route::post('/projects/{project}/os', [OrdreDeServiceController::class, 'store']);
    Route::patch('/projects/{project}/os/{os}/accuser', [OrdreDeServiceController::class, 'accuser']);
    Route::delete('/projects/{project}/os/{os}', [OrdreDeServiceController::class, 'destroy']);

    // ── BPU ───────────────────────────────────────────────────────────────────
    Route::get('/projects/{project}/bpu', [BpuController::class, 'index']);
    Route::get('/projects/{project}/bpu/{version}', [BpuController::class, 'show']);
    Route::post('/projects/{project}/bpu', [BpuController::class, 'store']);
    Route::patch('/projects/{project}/bpu/{version}/validate', [BpuController::class, 'validateVersion']);

    // ── Situation Travaux — DB workflow ───────────────────────────────────────
    Route::get('/projects/{project}/situation-travaux/list', [SituationTravauxController::class, 'list']);
    Route::post('/projects/{project}/situation-travaux/store', [SituationTravauxController::class, 'storeSituation']);
    Route::patch('/projects/{project}/situation-travaux/{situation}/submit', [SituationTravauxController::class, 'submit']);
    Route::patch('/projects/{project}/situation-travaux/{situation}/validate', [SituationTravauxController::class, 'validateSituation']);
    Route::patch('/projects/{project}/situation-travaux/{situation}/pay', [SituationTravauxController::class, 'pay']);

    // ── DGD ───────────────────────────────────────────────────────────────────
    Route::get('/projects/{project}/dgd', [DgdController::class, 'show']);
    Route::post('/projects/{project}/dgd/initialize', [DgdController::class, 'initialize']);
    Route::patch('/projects/{project}/dgd/sign', [DgdController::class, 'sign']);

    // ── DQE ──────────────────────────────────────────────────────────────────
    Route::middleware('permission:dqe')->group(function () {
        Route::get('/projects/{project}/dqe-versions', [DqeVersionController::class, 'index']);
        Route::post('/projects/{project}/dqe-versions', [DqeVersionController::class, 'store']);
        Route::get('/projects/{project}/dqe-versions/{dqeVersion}', [DqeVersionController::class, 'show']);
        Route::put('/projects/{project}/dqe-versions/{dqeVersion}', [DqeVersionController::class, 'update']);
        Route::delete('/projects/{project}/dqe-versions/{dqeVersion}', [DqeVersionController::class, 'destroy']);
        Route::post('/projects/{project}/dqe-versions/{dqeVersion}/lines', [DqeVersionController::class, 'storeLine']);
        Route::put('/projects/{project}/dqe-versions/{dqeVersion}/lines/{dqeLine}', [DqeVersionController::class, 'updateLine']);
        Route::delete('/projects/{project}/dqe-versions/{dqeVersion}/lines/{dqeLine}', [DqeVersionController::class, 'destroyLine']);
        Route::post('/projects/{project}/dqe-versions/{dqeVersion}/duplicate', [DqeVersionController::class, 'duplicate']);
        Route::patch('/projects/{project}/dqe-versions/{dqeVersion}/transition', [DqeVersionController::class, 'transition']);
        Route::get('/projects/{project}/dqe-versions/{dqeVersion}/pdf', [DqeVersionController::class, 'pdf']);
        Route::get('/projects/{project}/situation-travaux/versions', [SituationTravauxController::class, 'versions']);
        Route::post('/projects/{project}/situation-travaux', [SituationTravauxController::class, 'generate'])->middleware('throttle:10,60');
    });

    // ── Membres projet ────────────────────────────────────────────────────────
    Route::get('/projects/{project}/members', function (\Illuminate\Http\Request $req, \App\Models\Project $project) {
        abort_if($project->company_id !== $req->user()->company_id, 403);
        return response()->json(
            $project->members()->with('user:id,name,email')->get()
                ->map(fn($m) => ['id' => $m->user->id, 'name' => $m->user->name, 'email' => $m->user->email, 'role' => $m->assignment_role])
        );
    });

    // ── Réunions / Invitations ─────────────────────────────────────────────────
    Route::post('/meetings', [\App\Http\Controllers\MeetingController::class, 'store']);
    Route::patch('/meeting-invitations/{meetingId}/respond', [\App\Http\Controllers\MeetingController::class, 'respond']);
    Route::get('/meetings/{meetingId}/rsvp-status', [\App\Http\Controllers\MeetingController::class, 'rsvpStatus']);
    Route::get('/meetings/metrics', [\App\Http\Controllers\MeetingMetricsController::class, 'index']);

    // ── Notifications utilisateur ──────────────────────────────────────────────
    Route::get('/notifications', [\App\Http\Controllers\MeetingController::class, 'userNotifications']);
    Route::patch('/notifications/{id}/read', [\App\Http\Controllers\MeetingController::class, 'markRead']);
    Route::post('/notifications/read-all', [\App\Http\Controllers\MeetingController::class, 'markAllRead']);
});

// ── RSVP sans auth (lien email tokenisé) ──────────────────────────────────────
Route::get('/meetings/rsvp/{token}/{status}', [\App\Http\Controllers\MeetingController::class, 'rsvpViaToken']);
