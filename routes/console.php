<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Relances automatiques des factures en retard (à planifier avec le cron : `php artisan schedule:run`).
Artisan::command('facturo:relances', function () {
    $this->info(\App\Http\Controllers\DocumentController::relancesAutomatiques().' relance(s) envoyée(s).');
})->purpose('Relance par e-mail les factures impayées échues');

\Illuminate\Support\Facades\Schedule::command('facturo:relances')->dailyAt('09:00');
