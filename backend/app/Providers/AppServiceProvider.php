<?php

namespace App\Providers;

use App\Models\DailyLog;
use App\Models\Project;
use App\Models\User;
use App\Policies\DailyLogPolicy;
use App\Policies\ProjectPolicy;
use App\Policies\UserPolicy;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void {}

    public function boot(): void
    {
        Gate::policy(Project::class, ProjectPolicy::class);
        Gate::policy(DailyLog::class, DailyLogPolicy::class);
        Gate::policy(User::class, UserPolicy::class);
    }
}
