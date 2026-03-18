<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\AdminSendNotificationRequest;
use App\Models\Notification;
use App\Services\AdminActionLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminNotificationController extends Controller
{
    public function __construct(private readonly AdminActionLogger $logger) {}

    public function index(Request $request): JsonResponse
    {
        $perPage = max(1, min((int) $request->query('per_page', 20), 100));
        $targetUserId = (int) $request->query('target_user_id', 0);
        $status = trim((string) $request->query('status', ''));
        $search = trim((string) $request->query('search', ''));

        $rows = Notification::query()
            ->with([
                'targetUser:id,email,first_name,last_name,role',
                'creator:id,email,first_name,last_name',
            ])
            ->when($targetUserId > 0, fn ($query) => $query->where('target_user_id', $targetUserId))
            ->when($status === 'unread', fn ($query) => $query->whereNull('read_at')->whereNull('dismissed_at'))
            ->when($status === 'read', fn ($query) => $query->whereNotNull('read_at')->whereNull('dismissed_at'))
            ->when($status === 'dismissed', fn ($query) => $query->whereNotNull('dismissed_at'))
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($subQuery) use ($search) {
                    $like = '%'.$search.'%';

                    $subQuery
                        ->where('title', 'like', $like)
                        ->orWhere('body', 'like', $like)
                        ->orWhereHas('targetUser', function ($userQuery) use ($like) {
                            $userQuery
                                ->where('email', 'like', $like)
                                ->orWhere('first_name', 'like', $like)
                                ->orWhere('last_name', 'like', $like);
                        });
                });
            })
            ->latest('created_at')
            ->paginate($perPage);

        return response()->json($rows);
    }

    public function store(AdminSendNotificationRequest $request): JsonResponse
    {
        $data = $request->validated();
        $created = 0;

        DB::transaction(function () use ($request, $data, &$created) {
            foreach (array_unique($data['target_user_ids']) as $targetUserId) {
                Notification::query()->create([
                    'target_user_id' => $targetUserId,
                    'created_by' => $request->user()->id,
                    'title' => $data['title'],
                    'body' => $data['body'],
                ]);
                $created++;
            }

            $this->logger->log($request->user()->id, 'admin.notifications.send', null, [
                'count' => $created,
                'target_user_ids' => array_values(array_unique($data['target_user_ids'])),
                'title' => $data['title'],
            ]);
        });

        return response()->json(['ok' => true, 'sent' => $created], 201);
    }
}
