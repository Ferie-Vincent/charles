<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('project_snapshots', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('project_id');
            $table->unsignedBigInteger('company_id');
            $table->date('snapshot_date');

            // Progress
            $table->unsignedTinyInteger('progress_percent')->default(0);
            $table->unsignedTinyInteger('theoretical_progress')->default(0);
            $table->unsignedTinyInteger('health_score')->default(0);

            // Logs
            $table->unsignedSmallInteger('total_logs')->default(0);
            $table->unsignedSmallInteger('logs_last_7_days')->default(0);
            $table->date('last_log_date')->nullable();

            // Workers
            $table->unsignedSmallInteger('workers_today')->default(0);
            $table->decimal('avg_workers_7d', 6, 1)->default(0);

            // Budget
            $table->decimal('budget_previsionnel', 15, 2)->default(0);
            $table->decimal('budget_engage', 15, 2)->default(0);
            $table->decimal('budget_realise', 15, 2)->default(0);
            $table->decimal('budget_consumption_pct', 5, 2)->default(0);

            // Incidents
            $table->unsignedSmallInteger('incidents_total')->default(0);
            $table->unsignedSmallInteger('incidents_last_30d')->default(0);
            $table->unsignedSmallInteger('incidents_critiques')->default(0);

            // Stocks / Achats
            $table->unsignedSmallInteger('stock_alerts')->default(0);
            $table->unsignedSmallInteger('bdc_pending')->default(0);

            // Invoices
            $table->unsignedSmallInteger('invoices_pending')->default(0);
            $table->decimal('invoices_pending_amount', 15, 2)->default(0);

            // Weather (last log)
            $table->string('last_weather', 50)->nullable();

            // Materials (JSON array of top materials used)
            $table->json('top_materials')->nullable();

            // Project meta (denormalized for AI context)
            $table->string('project_name', 255);
            $table->date('project_start')->nullable();
            $table->date('project_end')->nullable();
            $table->string('project_status', 50)->nullable();
            $table->decimal('project_budget', 15, 2)->nullable();

            $table->timestamps();

            $table->unique(['project_id', 'snapshot_date']);
            $table->index(['company_id', 'snapshot_date']);
            $table->foreign('project_id')->references('id')->on('projects')->onDelete('cascade');
            $table->foreign('company_id')->references('id')->on('companies')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('project_snapshots');
    }
};
