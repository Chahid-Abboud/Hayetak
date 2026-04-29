<?php

use App\Models\Exercise;
use App\Services\Ai\Exercises\PlannerExerciseCatalogSyncService;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('syncs planner home exercises needed for workout persistence', function () {
    app(PlannerExerciseCatalogSyncService::class)->sync();

    $exerciseNames = Exercise::query()
        ->whereIn('name', ['Bodyweight Squat', 'Pike Push Up', 'Bodyweight Towel Row', 'Glute Bridge', 'Chair Step Up', 'Push Up', 'Doorframe Row'])
        ->pluck('name')
        ->all();

    expect($exerciseNames)->toContain('Bodyweight Squat')
        ->and($exerciseNames)->toContain('Pike Push Up')
        ->and($exerciseNames)->toContain('Bodyweight Towel Row')
        ->and($exerciseNames)->toContain('Glute Bridge')
        ->and($exerciseNames)->toContain('Chair Step Up')
        ->and($exerciseNames)->toContain('Push Up')
        ->and($exerciseNames)->toContain('Doorframe Row');
});
