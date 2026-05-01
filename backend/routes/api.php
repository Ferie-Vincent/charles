<?php

use App\Http\Controllers\AuthController;
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
use Illuminate\Support\Facades\Route;

Route::get('/health', function () {
    return response()->json([
        'status' => 'ok',
        'app' => config('app.name'),
        'timestamp' => now()->toIso8601String(),
    ]);
});

Route::prefix('auth')->group(function () {
    Route::post('/login', [AuthController::class, 'login']);

    Route::middleware('auth')->group(function () {
        Route::get('/me', [AuthController::class, 'me']);
        Route::post('/logout', [AuthController::class, 'logout']);
    });
});

Route::middleware('auth')->group(function () {
    Route::get('/dashboard', [DashboardController::class, 'index']);
    Route::get('/projects', [ProjectController::class, 'index']);
    Route::post('/projects', [ProjectController::class, 'store']);
    Route::get('/projects/{project}', [ProjectController::class, 'show']);
    Route::put('/projects/{project}', [ProjectController::class, 'update']);
    Route::get('/projects/{project}/daily-logs', [DailyLogController::class, 'index']);
    Route::post('/projects/{project}/daily-logs', [DailyLogController::class, 'store']);
    Route::get('/projects/{project}/health-score', [HealthScoreController::class, 'show']);
    Route::get('/projects/{project}/safety-score', [SafetyScoreController::class, 'show']);
    Route::get('/projects/{project}/material-receipts', [MaterialReceiptController::class, 'index']);
    Route::post('/projects/{project}/meeting-report', [MeetingReportController::class, 'generate']);
    Route::post('/projects/{project}/whatsapp/test', [WhatsAppTestController::class, 'test']);
    Route::get('/projects/{project}/photos', [ProjectPhotoController::class, 'index']);
    Route::post('/projects/{project}/photos', [ProjectPhotoController::class, 'store']);
    Route::delete('/projects/{project}/photos/{photo}', [ProjectPhotoController::class, 'destroy']);
    Route::get('/projects/{project}/incidents', [ProjectIncidentController::class, 'index']);
    Route::post('/projects/{project}/incidents', [ProjectIncidentController::class, 'store']);
    Route::patch('/projects/{project}/incidents/{incident}', [ProjectIncidentController::class, 'update']);
    Route::delete('/projects/{project}/incidents/{incident}', [ProjectIncidentController::class, 'destroy']);
    Route::get('/projects/{project}/incidents/{incident}/pdf', [ProjectIncidentController::class, 'pdf']);
    Route::get('/projects/{project}/budget', [BudgetController::class, 'index']);
    Route::post('/projects/{project}/budget/entries', [BudgetController::class, 'store']);
    Route::delete('/projects/{project}/budget/entries/{budgetEntry}', [BudgetController::class, 'destroy']);
    Route::get('/projects/{project}/report/pdf', [ProjectReportController::class, 'pdf']);
    Route::get('/projects/{project}/reports', [ProjectReportController::class, 'index']);
    Route::get('/projects/{project}/reports/{report}/download', [ProjectReportController::class, 'download']);
});
