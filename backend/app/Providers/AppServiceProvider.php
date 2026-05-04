<?php

namespace App\Providers;

use App\Events\BdcApproved;
use App\Events\BdcCancelled;
use App\Events\BdcReceived;
use App\Events\DailyLogCreated;
use App\Events\DemandeBesoinApproved;
use App\Events\DqeValidated;
use App\Events\InvoicePaid;
use App\Events\StockBelowThreshold;
use App\Listeners\ArchiveBdcDocsToGed;
use App\Listeners\ArchiveInvoiceProofToGed;
use App\Listeners\CreateBudgetEngagementOnBdcApproved;
use App\Listeners\CreateBudgetPaymentOnInvoicePaid;
use App\Listeners\CreateIncidentFromDailyLog;
use App\Listeners\CreatePreEngagementOnDemandeBesoinApproved;
use App\Listeners\CreateStockAlertOnLowStock;
use App\Listeners\ReverseEngagementOnBdcCancelled;
use App\Listeners\UpdateProjectBudgetOnDqeValidated;
use App\Listeners\UpdateProjectProgressOnDailyLog;
use App\Models\DailyLog;
use App\Models\Project;
use App\Models\User;
use App\Policies\DailyLogPolicy;
use App\Policies\ProjectPolicy;
use App\Policies\UserPolicy;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void {}

    public function boot(): void
    {
        Gate::policy(Project::class, ProjectPolicy::class);
        Gate::policy(DailyLog::class, DailyLogPolicy::class);
        Gate::policy(User::class, UserPolicy::class);

        RateLimiter::for('login', function ($request) {
            return Limit::perMinute(5)->by($request->ip());
        });

        Event::listen(BdcApproved::class, CreateBudgetEngagementOnBdcApproved::class);
        Event::listen(BdcCancelled::class, ReverseEngagementOnBdcCancelled::class);
        Event::listen(BdcReceived::class, ArchiveBdcDocsToGed::class);
        Event::listen(InvoicePaid::class, CreateBudgetPaymentOnInvoicePaid::class);
        Event::listen(InvoicePaid::class, ArchiveInvoiceProofToGed::class);
        Event::listen(DemandeBesoinApproved::class, CreatePreEngagementOnDemandeBesoinApproved::class);
        Event::listen(DailyLogCreated::class, UpdateProjectProgressOnDailyLog::class);
        Event::listen(DailyLogCreated::class, CreateIncidentFromDailyLog::class);
        Event::listen(DqeValidated::class, UpdateProjectBudgetOnDqeValidated::class);
        Event::listen(StockBelowThreshold::class, CreateStockAlertOnLowStock::class);
    }
}
