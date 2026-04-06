<?php

declare(strict_types=1);

require __DIR__.'/../vendor/autoload.php';

$app = require __DIR__.'/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\User;

$apply = in_array('--apply', $argv, true);

$template = User::query()
    ->whereRaw('LOWER(name)=?', ['nour khoury'])
    ->orWhere(function ($q): void {
        $q->whereRaw('LOWER(first_name)=?', ['nour'])
            ->whereRaw('LOWER(last_name)=?', ['hayek']);
    })
    ->first();

if (! $template) {
    fwrite(STDERR, "Template user (Nour Khoury) not found.\n");
    exit(1);
}

$fields = [
    'gender',
    'age',
    'height_cm',
    'weight_kg',
    'has_medical_history',
    'medical_history',
    'dietary_goal',
    'fitness_goal',
    'diet_name',
    'allergies',
    'activity_level',
    'workout_days_per_week',
    'workout_location',
    'tried_diet_before',
    'diet_failure_reasons',
    'diet_failure_other',
];

$stats = [
    'total_users_scanned' => 0,
    'users_needing_updates' => 0,
    'updated_users' => 0,
    'field_fill_counts' => array_fill_keys($fields, 0),
    'by_role' => [],
    'sample_updates' => [],
];

$users = User::query()
    ->where('id', '!=', $template->id)
    ->get();

foreach ($users as $user) {
    $stats['total_users_scanned']++;

    $updates = [];
    foreach ($fields as $field) {
        $current = $user->{$field};
        $fallback = $template->{$field};

        // Avoid inconsistent records like has_medical_history=false with filled medical_history text.
        if ($field === 'medical_history' && $user->has_medical_history === false) {
            continue;
        }

        if ($current === null && $fallback !== null) {
            $updates[$field] = $fallback;
            $stats['field_fill_counts'][$field]++;
        }
    }

    if ($updates === []) {
        continue;
    }

    $stats['users_needing_updates']++;
    $role = $user->role ?? 'unknown';
    $stats['by_role'][$role] = ($stats['by_role'][$role] ?? 0) + 1;
    if (count($stats['sample_updates']) < 10) {
        $stats['sample_updates'][] = [
            'id' => $user->id,
            'name' => $user->name,
            'role' => $role,
            'fields' => array_keys($updates),
        ];
    }

    if ($apply) {
        $user->fill($updates);
        $user->save();
        $stats['updated_users']++;
    }
}

$templateSummary = [
    'id' => $template->id,
    'name' => $template->name,
    'email' => $template->email,
    'role' => $template->role,
];

foreach ($fields as $f) {
    $templateSummary[$f] = $template->{$f};
}

echo json_encode([
    'mode' => $apply ? 'apply' : 'dry-run',
    'template_user' => $templateSummary,
    'stats' => $stats,
], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE), PHP_EOL;
