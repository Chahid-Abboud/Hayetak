<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\AdminResolveMessageModerationRequest;
use App\Models\MessageModeration;
use App\Services\AdminActionLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminMessageModerationController extends Controller
{
    public function __construct(
        private readonly AdminActionLogger $logger,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $decision = trim((string) $request->query('decision', 'all'));
        $state = trim((string) $request->query('state', 'open'));

        $rows = MessageModeration::query()
            ->with([
                'sender:id,first_name,last_name,name,email,role',
                'conversation.participants:id,first_name,last_name,name,email,role',
            ])
            ->when($decision !== 'all', fn ($query) => $query->where('decision', $decision))
            ->when($state === 'open', fn ($query) => $query->whereNull('resolved_at'))
            ->when($state === 'resolved', fn ($query) => $query->whereNotNull('resolved_at'))
            ->latest('id')
            ->limit(100)
            ->get()
            ->map(function (MessageModeration $moderation): array {
                return [
                    'id' => $moderation->id,
                    'decision' => $moderation->decision,
                    'severity' => $moderation->severity,
                    'categories' => $moderation->categories ?? [],
                    'reason' => $moderation->reason,
                    'original_body' => $moderation->original_body,
                    'sanitized_body' => $moderation->sanitized_body,
                    'created_at' => $moderation->created_at,
                    'escalated_at' => $moderation->escalated_at,
                    'resolved_at' => $moderation->resolved_at,
                    'resolution' => data_get($moderation->matched_terms ?? [], '_resolution'),
                    'resolution_notes' => data_get($moderation->matched_terms ?? [], '_resolution_notes'),
                    'signals' => data_get($moderation->matched_terms ?? [], '_signals'),
                    'sender' => [
                        'id' => $moderation->sender?->id,
                        'name' => $moderation->sender?->display_name,
                        'email' => $moderation->sender?->email,
                        'role' => $moderation->sender?->role,
                    ],
                    'conversation_id' => $moderation->conversation_id,
                ];
            })
            ->values();

        return response()->json([
            'stats' => [
                'total' => $rows->count(),
                'hard_block' => $rows->where('decision', 'hard_block')->count(),
                'allow_flagged' => $rows->where('decision', 'allow_flagged')->count(),
                'escalate' => $rows->where('decision', 'escalate')->count(),
            ],
            'items' => $rows,
        ]);
    }

    public function resolve(AdminResolveMessageModerationRequest $request, MessageModeration $messageModeration): JsonResponse
    {
        $actor = $request->user();
        $data = $request->validated();
        $matchedTerms = is_array($messageModeration->matched_terms) ? $messageModeration->matched_terms : [];
        $matchedTerms['_resolution'] = $data['resolution'];
        $matchedTerms['_resolution_notes'] = trim((string) ($data['notes'] ?? ''));

        $messageModeration->forceFill([
            'matched_terms' => $matchedTerms,
            'resolved_at' => now(),
        ])->save();

        $this->logger->log($actor->id, 'message.moderation.resolve', $messageModeration, [
            'resolution' => $data['resolution'],
            'notes' => $matchedTerms['_resolution_notes'],
        ]);

        return response()->json([
            'ok' => true,
            'item' => [
                'id' => $messageModeration->id,
                'resolved_at' => $messageModeration->resolved_at,
                'resolution' => $matchedTerms['_resolution'],
                'resolution_notes' => $matchedTerms['_resolution_notes'],
            ],
        ]);
    }
}
