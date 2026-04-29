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
        $perPage = max(1, min((int) $request->query('per_page', 30), 100));
        $search = trim((string) $request->query('search', ''));
        $targetType = trim((string) $request->query('target_type', ''));
        $action = trim((string) $request->query('action', ''));

        $logs = AdminActionLog::query()
            ->with('admin:id,first_name,last_name,name,email')
            ->when($action !== '', fn ($query) => $query->where('action', 'like', '%'.$action.'%'))
            ->when($targetType !== '', fn ($query) => $query->where('target_type', 'like', '%'.$targetType.'%'))
            ->when($search !== '', function ($query) use ($search) {
                $like = '%'.$search.'%';

                $query->where(function ($subQuery) use ($like) {
                    $subQuery
                        ->where('action', 'like', $like)
                        ->orWhere('target_type', 'like', $like)
                        ->orWhere('target_id', 'like', $like)
                        ->orWhereHas('admin', function ($adminQuery) use ($like) {
                            $adminQuery
                                ->where('email', 'like', $like)
                                ->orWhere('name', 'like', $like)
                                ->orWhere('first_name', 'like', $like)
                                ->orWhere('last_name', 'like', $like);
                        });
                });
            })
            ->latest('created_at')
            ->paginate($perPage);

        return response()->json($logs);
    }
}
