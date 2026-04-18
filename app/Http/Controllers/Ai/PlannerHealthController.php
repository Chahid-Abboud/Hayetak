<?php

namespace App\Http\Controllers\Ai;

use App\Http\Controllers\Controller;
use App\Services\Ai\PlannerHealthService;
use Illuminate\Http\JsonResponse;

class PlannerHealthController extends Controller
{
    public function __invoke(PlannerHealthService $health): JsonResponse
    {
        return response()->json([
            'ok' => true,
            'health' => $health->snapshot(),
        ]);
    }
}

