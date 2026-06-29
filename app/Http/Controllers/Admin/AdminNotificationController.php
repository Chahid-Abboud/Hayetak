<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\AdminSendNotificationRequest;
use App\Models\AdminActionLog;
use App\Models\Notification;
use App\Models\User;
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
        $status = trim((string) $request->query('status', ''));
        $search = trim((string) $request->query('search', ''));
        $type = trim((string) $request->query('type', 'all'));

        $campaigns = AdminActionLog::query()
            ->with('admin:id,email,first_name,last_name')
            ->whereIn('action', ['admin.notifications.send', 'admin.notifications.resend_failed'])
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($subQuery) use ($search) {
                    $like = '%'.$search.'%';
                    $subQuery
                        ->where('metadata->title', 'like', $like)
                        ->orWhere('metadata->body', 'like', $like)
                        ->orWhere('metadata->audience_label', 'like', $like);
                });
            })
            ->when($type !== 'all', fn ($query) => $query->where('metadata->type', $type))
            ->latest('created_at')
            ->paginate($perPage);

        $campaigns->setCollection($campaigns->getCollection()
            ->map(fn (AdminActionLog $log) => $this->serializeCampaign($log))
            ->when($status !== '', fn ($collection) => $collection
                ->filter(function (array $campaign) use ($status) {
                    return match ($status) {
                        'sent' => $campaign['status'] === 'sent',
                        'partial' => $campaign['status'] === 'partial',
                        'failed' => $campaign['status'] === 'failed',
                        'unread' => $campaign['unread_count'] > 0,
                        'read' => $campaign['read_count'] > 0,
                        'dismissed' => $campaign['dismissed_count'] > 0,
                        default => true,
                    };
                })
                ->values()));

        return response()->json([
            ...$campaigns->toArray(),
            'stats' => $this->stats(),
        ]);
    }

    public function store(AdminSendNotificationRequest $request): JsonResponse
    {
        $data = $request->validated();
        $audience = $data['audience'] ?? 'selected';
        $targetUserIds = $this->resolveAudience($audience, $data['target_user_ids'] ?? []);
        abort_if($targetUserIds === [], 422, 'Choose at least one recipient or audience group.');

        $created = 0;
        $failed = [];

        DB::transaction(function () use ($request, $data, $targetUserIds, $audience, &$created, &$failed) {
            foreach ($targetUserIds as $targetUserId) {
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
                'target_user_ids' => $targetUserIds,
                'failed_user_ids' => $failed,
                'audience' => $audience,
                'audience_label' => $this->audienceLabel($audience),
                'type' => $data['type'] ?? 'announcement',
                'title' => $data['title'],
                'body' => $data['body'],
            ]);
        });

        return response()->json(['ok' => true, 'sent' => $created], 201);
    }

    public function resendFailed(Request $request, AdminActionLog $adminActionLog): JsonResponse
    {
        abort_unless(in_array($adminActionLog->action, ['admin.notifications.send', 'admin.notifications.resend_failed'], true), 404);

        $metadata = $adminActionLog->metadata ?? [];
        $failedIds = array_values(array_unique(array_map('intval', $metadata['failed_user_ids'] ?? [])));

        if ($failedIds === []) {
            return response()->json(['ok' => true, 'sent' => 0, 'message' => 'No failed deliveries to resend.']);
        }

        $sent = 0;

        DB::transaction(function () use ($request, $metadata, $failedIds, &$sent) {
            foreach ($failedIds as $targetUserId) {
                if (! User::query()->whereKey($targetUserId)->exists()) {
                    continue;
                }

                Notification::query()->create([
                    'target_user_id' => $targetUserId,
                    'created_by' => $request->user()->id,
                    'title' => (string) ($metadata['title'] ?? 'Notification'),
                    'body' => (string) ($metadata['body'] ?? ''),
                ]);
                $sent++;
            }

            $this->logger->log($request->user()->id, 'admin.notifications.resend_failed', null, [
                ...$metadata,
                'count' => $sent,
                'target_user_ids' => $failedIds,
                'failed_user_ids' => [],
                'resend_of' => $metadata['campaign_id'] ?? null,
            ]);
        });

        return response()->json(['ok' => true, 'sent' => $sent]);
    }

    private function serializeCampaign(AdminActionLog $log): array
    {
        $metadata = $log->metadata ?? [];
        $targetUserIds = array_values(array_unique(array_map('intval', $metadata['target_user_ids'] ?? [])));
        $failedUserIds = array_values(array_unique(array_map('intval', $metadata['failed_user_ids'] ?? [])));
        $notifications = Notification::query()
            ->where('created_by', $log->admin_id)
            ->where('title', (string) ($metadata['title'] ?? ''))
            ->where('body', (string) ($metadata['body'] ?? ''))
            ->whereIn('target_user_id', $targetUserIds)
            ->whereBetween('created_at', [
                $log->created_at->copy()->subSeconds(10),
                $log->created_at->copy()->addSeconds(10),
            ])
            ->get();

        $deliveredCount = $notifications->count();
        $failedCount = count($failedUserIds);
        $unreadNotifications = $notifications
            ->whereNull('read_at')
            ->whereNull('dismissed_at')
            ->values();

        return [
            'id' => $log->id,
            'recipient_group' => (string) ($metadata['audience_label'] ?? 'Selected users'),
            'recipient_count' => (int) ($metadata['count'] ?? $deliveredCount),
            'title' => (string) ($metadata['title'] ?? 'Untitled'),
            'body' => (string) ($metadata['body'] ?? ''),
            'type' => (string) ($metadata['type'] ?? 'announcement'),
            'status' => $failedCount > 0 ? ($deliveredCount > 0 ? 'partial' : 'failed') : 'sent',
            'sent_time' => optional($log->created_at)?->toISOString(),
            'read_count' => $notifications->whereNotNull('read_at')->count(),
            'dismissed_count' => $notifications->whereNotNull('dismissed_at')->count(),
            'unread_count' => $unreadNotifications->count(),
            'failed_deliveries' => $failedCount,
            'failed_user_ids' => $failedUserIds,
            'target_user_ids' => $unreadNotifications->pluck('target_user_id')->map(fn ($id) => (int) $id)->values()->all(),
            'target_user_id' => $unreadNotifications->count() === 1
                ? (int) $unreadNotifications->first()->target_user_id
                : null,
            'sender' => $log->admin ? [
                'id' => $log->admin->id,
                'name' => $log->admin->display_name,
                'email' => $log->admin->email,
            ] : null,
        ];
    }

    private function stats(): array
    {
        $notifications = Notification::query()->get();
        $campaigns = AdminActionLog::query()
            ->where('action', 'admin.notifications.send')
            ->count();

        return [
            'campaigns' => $campaigns,
            'delivered' => $notifications->count(),
            'read' => $notifications->whereNotNull('read_at')->count(),
            'dismissed' => $notifications->whereNotNull('dismissed_at')->count(),
            'unread' => $notifications->whereNull('read_at')->whereNull('dismissed_at')->count(),
        ];
    }

    private function resolveAudience(string $audience, array $selectedIds): array
    {
        $query = User::query()->select('id');

        match ($audience) {
            'all_clients' => $query->where('role', User::ROLE_CLIENT),
            'all_professionals' => $query->whereIn('role', [User::ROLE_TRAINER, User::ROLE_NUTRITIONIST]),
            'trainers' => $query->where('role', User::ROLE_TRAINER),
            'nutritionists' => $query->where('role', User::ROLE_NUTRITIONIST),
            'admins' => $query->where('role', User::ROLE_ADMIN),
            'unverified' => $query->where('verified', false),
            default => $query->whereIn('id', array_map('intval', $selectedIds)),
        };

        return $query->pluck('id')->map(fn ($id) => (int) $id)->unique()->values()->all();
    }

    private function audienceLabel(string $audience): string
    {
        return match ($audience) {
            'all_clients' => 'All clients',
            'all_professionals' => 'All professionals',
            'trainers' => 'Trainers',
            'nutritionists' => 'Nutritionists',
            'admins' => 'Admins',
            'unverified' => 'Unverified users',
            default => 'Selected users',
        };
    }
}
