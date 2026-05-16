<?php

namespace App\Providers;

use App\Models\DailyLog;
use App\Models\Project;
use App\Models\ProjectWorker;
use App\Models\Task;
use App\Models\User;
use App\Observers\TaskObserver;
use App\Policies\DailyLogPolicy;
use App\Policies\ProjectPolicy;
use App\Policies\ProjectWorkerPolicy;
use App\Policies\UserPolicy;
use Illuminate\Cache\RateLimiting\Limit;
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
        Gate::policy(ProjectWorker::class, ProjectWorkerPolicy::class);

        Task::observe(TaskObserver::class);

        RateLimiter::for('login', function ($request) {
            return Limit::perMinute(5)->by($request->ip());
        });
    }
}
