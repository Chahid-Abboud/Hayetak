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
        // long-running requests do not block other tabs/pages.
        $session->save();
    }
}
