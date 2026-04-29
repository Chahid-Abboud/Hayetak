<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::command('ai:run-planner-feedback-cycles', [
    '--start-date' => (string) config('ai.planner.feedback_cycle.start_date', '2026-01-01'),
    '--anchor-date' => (string) config('ai.planner.feedback_cycle.anchor_date', '2026-01-01'),
    '--interval-days' => (int) config('ai.planner.feedback_cycle.interval_days', 21),
    '--plan-days' => 21,
])->dailyAt('02:10')->withoutOverlapping();
