<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AdminActionLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminActionLogController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $logs = AdminActionLog::query()
            ->with('admin:id,first_name,last_name,name,email')
            ->latest('created_at')
            ->paginate((int) $request->query('per_page', 30));

        return response()->json($logs);
    }
}
