<?php

namespace App\Http\Controllers;

use App\Http\Resources\NotificationResource;
use App\Models\Notification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UserNotificationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $notifications = Notification::query()
            ->where('target_user_id', $request->user()->id)
            ->latest('created_at')
            ->paginate((int) $request->query('per_page', 20));

        return response()->json(NotificationResource::collection($notifications));
    }

    public function markRead(Request $request, Notification $notification): JsonResponse
    {
        abort_unless($notification->target_user_id === $request->user()->id, 403);
        $notification->update(['read_at' => now()]);

        return response()->json(['ok' => true]);
    }

    public function dismiss(Request $request, Notification $notification): JsonResponse
    {
        abort_unless($notification->target_user_id === $request->user()->id, 403);
        $notification->update(['dismissed_at' => now()]);

        return response()->json(['ok' => true]);
    }
}
