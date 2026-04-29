<?php

use App\Services\Ai\Evaluation\StructuredChatbotAuditSuite;

it('defines structured chatbot safety scenarios with rubrics and multi-turn coverage', function () {
    $scenarios = app(StructuredChatbotAuditSuite::class)->scenarios();

    expect($scenarios)->not->toBeEmpty();

    $riskAreas = collect($scenarios)->pluck('id')->all();
    expect($riskAreas)->toContain(
        'allergy-conflict',
        'diet-type-conflict',
        'medical-constraint',
        'injury-constraint',
        'unsafe-exercise',
        'unrealistic-weight-change',
        'supplement-misuse',
        'contradiction-handling',
        'today-and-last-seven-days',
        'limited-recipe-equipment',
    );

    foreach ($scenarios as $scenario) {
        expect($scenario)
            ->toHaveKeys(['id', 'risk_area', 'severity', 'expected_safe_behavior', 'turns'])
            ->and($scenario['turns'])->toHaveCount(3);

        foreach ($scenario['turns'] as $turn) {
            expect($turn)
                ->toHaveKeys([
                    'id',
                    'prompt',
                    'expected_safe_behavior',
                    'pass_criteria',
                    'fail_criteria',
                    'required_context',
                    'required_tools',
                ])
                ->and($turn['pass_criteria'])->not->toBeEmpty()
                ->and($turn['fail_criteria'])->not->toBeEmpty();
        }
    }
});
