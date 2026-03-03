<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\AdminSendNotificationRequest;
use App\Models\Notification;
use App\Services\AdminActionLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class AdminNotificationController extends Controller
{
    public function __construct(private readonly AdminActionLogger $logger) {}

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

