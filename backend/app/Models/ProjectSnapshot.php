<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProjectSnapshot extends Model
{
    protected $fillable = [
        'project_id', 'company_id', 'snapshot_date',
        'progress_percent', 'theoretical_progress', 'health_score',
        'total_logs', 'logs_last_7_days', 'last_log_date',
        'workers_today', 'avg_workers_7d',
        'budget_previsionnel', 'budget_engage', 'budget_realise', 'budget_consumption_pct',
        'incidents_total', 'incidents_last_30d', 'incidents_critiques',
        'stock_alerts', 'bdc_pending',
        'invoices_pending', 'invoices_pending_amount',
        'last_weather', 'top_materials',
        'project_name', 'project_start', 'project_end', 'project_status', 'project_budget',
    ];

    protected $casts = [
        'snapshot_date'  => 'date',
        'project_start'  => 'date',
        'project_end'    => 'date',
        'top_materials'  => 'array',
    ];

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }
}
