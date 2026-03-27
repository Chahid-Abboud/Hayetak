<?php

use App\Models\User;

it('allows an admin to access the coach page', function () {
    $admin = User::factory()->create([
        'role' => User::ROLE_ADMIN,
        'verified' => true,
        'email_verified_at' => now(),
    ]);

    $this->actingAs($admin)
        ->get('/coach')
        ->assertOk();
});

it('keeps coach entry points visible in the shared nav, admin shell, and dashboard shortcut code', function () {
    expect(file_get_contents(resource_path('js/components/NavHeader.tsx')))
        ->toContain("{ href: '/coach', label: 'Coach' }");

    expect(file_get_contents(resource_path('js/components/admin/AdminShell.tsx')))
        ->toContain("{ href: '/coach', label: 'AI Coach' }");

    expect(file_get_contents(resource_path('js/pages/dashboard.tsx')))
        ->toContain("router.visit('/coach')")
        ->toContain('Open AI Coach');
});
