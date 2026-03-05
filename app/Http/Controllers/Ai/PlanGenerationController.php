<?php

namespace App\Http\Controllers\Ai;

use App\Http\Controllers\Controller;
use App\Jobs\GeneratePlansForUser;
use Illuminate\Http\Request;

class PlanGenerationController extends Controller
{
    /**
     * Trigger plan generation for the currently logged-in user.
     * Useful for manual testing without re-registering.
     */
    public function generate(Request $request)
    {
        $user = $request->user();

        $days = (int) $request->input('days', 7);
        if ($days < 1) {
            $days = 1;
        }
        if ($days > 14) {
            $days = 14;
        }

        GeneratePlansForUser::dispatch(
            userId: $user->id,
            days: $days,
            regenerate: true,
            reason: 'legacy_api_generate_plans'
        );

        return response()->json([
            'ok' => true,
            'message' => 'Plan generation dispatched',
            'days' => $days,
        ]);
    }
}
