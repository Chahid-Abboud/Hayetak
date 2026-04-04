<?php

uses(Tests\TestCase::class);

test('session config normalizes null-like cookie settings', function () {
    $originalDomain = $_ENV['SESSION_DOMAIN'] ?? null;
    $originalServerDomain = $_SERVER['SESSION_DOMAIN'] ?? null;
    $originalSameSite = $_ENV['SESSION_SAME_SITE'] ?? null;
    $originalServerSameSite = $_SERVER['SESSION_SAME_SITE'] ?? null;
    try {
        putenv('SESSION_DOMAIN=null');
        putenv('SESSION_SAME_SITE=null');
        $_ENV['SESSION_DOMAIN'] = 'null';
        $_SERVER['SESSION_DOMAIN'] = 'null';
        $_ENV['SESSION_SAME_SITE'] = 'null';
        $_SERVER['SESSION_SAME_SITE'] = 'null';

        $config = require __DIR__.'/../../config/session.php';

        expect($config['domain'])->toBeNull()
            ->and($config['same_site'])->toBeNull();
    } finally {
        if ($originalDomain === null) {
            putenv('SESSION_DOMAIN');
            unset($_ENV['SESSION_DOMAIN'], $_SERVER['SESSION_DOMAIN']);
        } else {
            putenv("SESSION_DOMAIN={$originalDomain}");
            $_ENV['SESSION_DOMAIN'] = $originalDomain;
            $_SERVER['SESSION_DOMAIN'] = $originalServerDomain ?? $originalDomain;
        }

        if ($originalSameSite === null) {
            putenv('SESSION_SAME_SITE');
            unset($_ENV['SESSION_SAME_SITE'], $_SERVER['SESSION_SAME_SITE']);
        } else {
            putenv("SESSION_SAME_SITE={$originalSameSite}");
            $_ENV['SESSION_SAME_SITE'] = $originalSameSite;
            $_SERVER['SESSION_SAME_SITE'] = $originalServerSameSite ?? $originalSameSite;
        }
    }
});
