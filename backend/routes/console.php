<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Weekly reports — every Monday at 07:00
Schedule::command('reports:weekly')->weeklyOn(1, '07:00');

// Meeting reminders — check every 15 minutes, send if meeting in 25-35 min window
Schedule::command('meetings:send-reminders')->everyFifteenMinutes();

// Payment overdue — daily 08:00, alert DT + comptable on situations validée_moe > 30 days
Schedule::command('situations:check-payment-overdue')->dailyAt('08:00');
