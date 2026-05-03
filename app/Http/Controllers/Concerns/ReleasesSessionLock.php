<?php

namespace App\Http\Controllers\Concerns;

use Illuminate\Http\Request;

trait ReleasesSessionLock
{
    protected function releaseSessionLock(Request $request): void
    {
        if (! $request->hasSession()) {
            return;
        }

        $session = $request->session();

        if (! $session->isStarted()) {
            return;
        }

        // Persist session changes early and release the underlying lock so
        // long-running AI requests do not block other tabs/pages.
        $session->save();

        // Extra safety for native PHP session/file-session locking.
        if (function_exists('session_write_close')) {
            @session_write_close();
        }
    }
}