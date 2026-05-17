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

// Payment overdue — daily 08:00 Abidjan, alert DT + comptable on situations validée_moe > 30 days
Schedule::command('situations:check-payment-overdue')->dailyAt('08:00')->timezone('Africa/Abidjan');

// Contestation delay — daily 09:00 Abidjan, alert DT on situations soumise > 30 days without MOE response
Schedule::command('situations:check-contestation-delay')->dailyAt('09:00')->timezone('Africa/Abidjan');

// Mineur incident daily digest — CT + DT at 18:00 Abidjan
Schedule::command('incidents:send-mineur-digest')->dailyAt('18:00')->timezone('Africa/Abidjan');
