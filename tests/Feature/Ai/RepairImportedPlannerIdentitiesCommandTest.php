<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

it('repairs imported planner placeholder identities into human-readable internal accounts', function () {
    $user = User::factory()->create([
        'name' => 'Planner P0058',
        'first_name' => 'Planner',
        'last_name' => 'P0058',
        'username' => 'planner_p0058',
        'email' => 'planner+p0058@hayetak.local',
        'gender' => 'female',
        'data_origin' => User::DATA_ORIGIN_IMPORTED_REAL,
        'role' => User::ROLE_CLIENT,
    ]);

    DB::table('user_prefs')->insert([
        'user_id' => $user->id,
        'units' => 'metric',
        'settings' => json_encode([
            'import_source' => 'planner_dataset_import',
            'profile_id' => 'P0058',
        ], JSON_THROW_ON_ERROR),
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $this->artisan('ai:repair-imported-planner-identities', [
        '--dry-run' => 0,
    ])->assertExitCode(0);

    $user->refresh();

    expect($user->name)->not->toBe('Planner P0058')
        ->and($user->first_name)->not->toBe('Planner')
        ->and($user->last_name)->not->toBe('P0058')
        ->and($user->username)->not->toBe('planner_p0058')
        ->and($user->email)->not->toBe('planner+p0058@hayetak.local')
        ->and($user->email)->toEndWith('@clients.hayetak.local')
        ->and($user->username)->toContain('p0058');
});

