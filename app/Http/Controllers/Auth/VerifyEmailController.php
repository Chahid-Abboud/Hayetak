<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Auth\Events\Verified;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class VerifyEmailController extends Controller
{
    /**
     * Mark the authenticated user's email address as verified.
     */
    public function __invoke(Request $request): RedirectResponse
    {
        abort_unless(
            $request->hasValidSignature() || $request->hasValidRelativeSignature(),
            403,
            'Invalid signature.'
        );

        $user = User::query()->findOrFail($request->route('id'));

        abort_unless(
            hash_equals((string) $request->route('hash'), sha1($user->getEmailForVerification())),
            403
        );

        Auth::login($user);
        $request->session()->regenerate();

        if ($user->hasVerifiedEmail()) {
            return redirect()->route('dashboard');
        }

        $user->markEmailAsVerified();
        event(new Verified($user));

        return redirect()
            ->route('dashboard')
            ->with('verificationArrival', [
                'account_id' => (int) $user->id,
                'verified_at' => now()->toIso8601String(),
                'headline' => 'Account verified',
                'message' => 'Your email has been confirmed and your dashboard is ready.',
            ])
            ->with(
                'showOptionalTwoFactorPrompt',
                ! $user->hasEnabledTwoFactorAuthentication(),
            );
    }
}
