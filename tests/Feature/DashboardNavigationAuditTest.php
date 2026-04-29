<?php

use Illuminate\Support\Str;

it('keeps ai outcome sections at the top of the non-admin dashboard flow', function () {
    $source = file_get_contents(resource_path('js/pages/dashboard.tsx'));

    $coach = strpos($source, 'title="AI coach"');
    $planner = strpos($source, 'title="Planner result"');
    $predictor = strpos($source, 'title="Predictor vs Actual trend"');
    $nutrition = strpos($source, 'title="Today\'s nutrition board"');

    expect($coach)->not->toBeFalse()
        ->and($planner)->not->toBeFalse()
        ->and($predictor)->not->toBeFalse()
        ->and($nutrition)->not->toBeFalse()
        ->and($coach)->toBeLessThan($nutrition)
        ->and($planner)->toBeLessThan($nutrition)
        ->and($predictor)->toBeLessThan($nutrition);
});

it('keeps role navigation groups free of duplicate non-admin links', function () {
    $source = file_get_contents(resource_path('js/components/product/app-shell.tsx'));
    $secondaryBlock = Str::between(
        $source,
        'const programItems: NavItem[] = [',
        'return groups;',
    );

    expect($secondaryBlock)->not->toContain("href: '/ai/planner'")
        ->and($secondaryBlock)->not->toContain("href: '/track-meals'")
        ->and($secondaryBlock)->not->toContain("href: '/workouts/log'")
        ->and(substr_count($secondaryBlock, "href: '/workouts/plan'"))->toBe(1)
        ->and(substr_count($secondaryBlock, "href: '/trainer/clients'"))->toBe(1)
        ->and(substr_count($secondaryBlock, "href: '/dietitian/clients'"))->toBe(1)
        ->and(substr_count($secondaryBlock, "href: '/settings/profile'"))->toBe(1)
        ->and(substr_count($secondaryBlock, "href: '/settings/security'"))->toBe(1);
});
