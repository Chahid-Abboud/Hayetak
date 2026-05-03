<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AdminActionLog;
use App\Models\Measurement;
use App\Services\AdminActionLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

class AdminProgressController extends Controller
{
    public function __construct(private readonly AdminActionLogger $logger) {}

    public function index(Request $request): JsonResponse
    {
        $userId = $request->query('user_id');
        $search = trim((string) $request->query('search', ''));
        $type = trim((string) $request->query('type', 'all'));
        $outlier = trim((string) $request->query('outlier', 'all'));
        $source = trim((string) $request->query('source', 'all'));

        $baseQuery = Measurement::query()->with('user:id,email,first_name,last_name');
        $allRows = (clone $baseQuery)
            ->when($userId, fn ($q) => $q->where('user_id', (int) $userId))
            ->orderBy('user_id')
            ->orderBy('measured_at')
            ->get();

        $logMap = $this->adminLogMap($allRows->pluck('id')->all());
        $serializedAll = $this->serializeMeasurements($allRows, $logMap);

        $stats = [
            'total_records' => $serializedAll->count(),
            'manual_edits' => $serializedAll->where('manual_edit', true)->count(),
            'outliers' => $serializedAll->filter(fn (array $row) => $row['outlier_signal']['flagged'])->count(),
            'users_with_records' => $allRows->pluck('user_id')->unique()->count(),
        ];

        $rows = Measurement::query()
            ->with('user:id,email,first_name,last_name')
            ->when($userId, fn ($q) => $q->where('user_id', (int) $userId))
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($inner) use ($search) {
                    $inner
                        ->whereHas('user', function ($userQuery) use ($search) {
                            $userQuery
                                ->where('email', 'like', "%{$search}%")
                                ->orWhere('first_name', 'like', "%{$search}%")
                                ->orWhere('last_name', 'like', "%{$search}%");
                        })
                        ->orWhere('notes', 'like', "%{$search}%");
                });
            })
            ->when($type !== 'all' && in_array($type, $this->metricColumns(), true), fn ($q) => $q->whereNotNull($type))
            ->orderByDesc('measured_at')
            ->paginate((int) $request->query('per_page', 30));

        $pageLogMap = $this->adminLogMap($rows->getCollection()->pluck('id')->all());
        $rows->setCollection($this->serializeMeasurements($rows->getCollection(), $pageLogMap)
            ->when($outlier !== 'all', fn ($collection) => $collection
                ->filter(fn (array $row) => $outlier === 'flagged'
                    ? $row['outlier_signal']['flagged']
                    : ! $row['outlier_signal']['flagged'])
                ->values())
            ->when($source !== 'all', fn ($collection) => $collection
                ->filter(fn (array $row) => $row['source'] === $source)
                ->values()));

        $selectedUserId = $userId ?: ($rows->getCollection()->first()['user_id'] ?? null);

        return response()->json([
            ...$rows->toArray(),
            'stats' => $stats,
            'selected_user_summary' => $this->selectedUserSummary($serializedAll, $selectedUserId ? (int) $selectedUserId : null),
            'trend' => $this->trendForUser($serializedAll, $selectedUserId ? (int) $selectedUserId : null),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validatePayload($request, false);
        $reason = $data['reason'] ?? null;
        unset($data['reason']);

        $measurement = Measurement::query()->create($data);
        $this->logger->log($request->user()->id, 'admin.progress.create', $measurement, [
            ...$data,
            'reason' => $reason,
            'source' => 'admin_manual',
        ]);

        return response()->json(['ok' => true, 'measurement' => $measurement], 201);
    }

    public function update(Request $request, Measurement $measurement): JsonResponse
    {
        $data = $this->validatePayload($request, true);
        $reason = $data['reason'] ?? null;
        unset($data['reason']);

        $before = $measurement->toArray();
        $measurement->update($data);
        $this->logger->log($request->user()->id, 'admin.progress.update', $measurement, [
            'before' => $before,
            'after' => $measurement->fresh()->toArray(),
            'reason' => $reason,
            'source' => 'admin_manual',
        ]);

        return response()->json(['ok' => true, 'measurement' => $measurement->fresh()]);
    }

    public function destroy(Request $request, Measurement $measurement): JsonResponse
    {
        $data = $request->validate([
            'reason' => ['nullable', 'string', 'max:2000'],
        ]);
        $payload = $measurement->only(['id', 'user_id', 'measured_at']);
        $measurement->delete();
        $this->logger->log($request->user()->id, 'admin.progress.delete', null, [
            ...$payload,
            'reason' => $data['reason'] ?? null,
        ]);

        return response()->json(['ok' => true]);
    }

    public function markOutlier(Request $request, Measurement $measurement): JsonResponse
    {
        $data = $request->validate([
            'metric' => ['required', 'string', 'in:weight_kg,height_cm,body_fat_pct,neck_cm,chest_cm,waist_cm,hip_cm,arm_cm,thigh_cm,calf_cm,resting_hr,systolic_bp,diastolic_bp'],
            'reason' => ['required', 'string', 'max:2000'],
        ]);

        $this->logger->log($request->user()->id, 'admin.progress.mark_outlier', $measurement, [
            'metric' => $data['metric'],
            'value' => $measurement->{$data['metric']},
            'reason' => $data['reason'],
        ]);

        return response()->json(['ok' => true]);
    }

    private function validatePayload(Request $request, bool $partial): array
    {
        $rules = [
            'user_id' => [$partial ? 'sometimes' : 'required', 'integer', 'exists:users,id'],
            'measured_at' => [$partial ? 'sometimes' : 'required', 'date'],
            'weight_kg' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'body_fat_pct' => ['sometimes', 'nullable', 'numeric', 'min:0', 'max:100'],
            'waist_cm' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'chest_cm' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'hip_cm' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'resting_hr' => ['sometimes', 'nullable', 'integer', 'min:20', 'max:260'],
            'systolic_bp' => ['sometimes', 'nullable', 'integer', 'min:50', 'max:260'],
            'diastolic_bp' => ['sometimes', 'nullable', 'integer', 'min:30', 'max:200'],
            'notes' => ['sometimes', 'nullable', 'string', 'max:4000'],
            'reason' => ['sometimes', 'nullable', 'string', 'max:2000'],
        ];

        return $request->validate($rules);
    }

    private function serializeMeasurements(Collection $measurements, Collection $logMap): Collection
    {
        $byUser = $measurements->groupBy('user_id');

        return $measurements->map(function (Measurement $measurement) use ($byUser, $logMap) {
            $logs = $logMap->get($measurement->id, collect());
            $latestLog = $logs->first();
            $latestEdit = $logs->first(fn (AdminActionLog $log) => in_array($log->action, ['admin.progress.create', 'admin.progress.update'], true));
            $manualOutlier = $logs->firstWhere('action', 'admin.progress.mark_outlier');
            $metric = $this->primaryMetric($measurement);
            $outlier = $this->outlierSignal($measurement, $byUser->get($measurement->user_id, collect()));

            if ($manualOutlier) {
                $outlier = [
                    'flagged' => true,
                    'severity' => 'warning',
                    'reason' => $manualOutlier->metadata['reason'] ?? 'Marked as an outlier by an admin.',
                    'metric' => $manualOutlier->metadata['metric'] ?? $metric['type'],
                ];
            }

            return [
                'id' => $measurement->id,
                'user_id' => $measurement->user_id,
                'measured_at' => optional($measurement->measured_at)?->toDateString() ?? (string) $measurement->measured_at,
                'weight_kg' => $measurement->weight_kg,
                'height_cm' => $measurement->height_cm,
                'body_fat_pct' => $measurement->body_fat_pct,
                'neck_cm' => $measurement->neck_cm,
                'chest_cm' => $measurement->chest_cm,
                'waist_cm' => $measurement->waist_cm,
                'hip_cm' => $measurement->hip_cm,
                'arm_cm' => $measurement->arm_cm,
                'thigh_cm' => $measurement->thigh_cm,
                'calf_cm' => $measurement->calf_cm,
                'resting_hr' => $measurement->resting_hr,
                'systolic_bp' => $measurement->systolic_bp,
                'diastolic_bp' => $measurement->diastolic_bp,
                'notes' => $measurement->notes,
                'measurement_type' => $metric['type'],
                'measurement_label' => $metric['label'],
                'measurement_value' => $metric['value'],
                'measurement_unit' => $metric['unit'],
                'outlier_signal' => $outlier,
                'source' => $latestEdit ? 'admin_manual' : 'user_logged',
                'manual_edit' => (bool) $latestEdit,
                'edited_by' => $latestLog?->admin ? [
                    'id' => $latestLog->admin->id,
                    'name' => $latestLog->admin->display_name,
                    'email' => $latestLog->admin->email,
                ] : null,
                'audit_note' => $latestLog?->metadata['reason'] ?? null,
                'last_audit_action' => $latestLog?->action,
                'last_audit_at' => optional($latestLog?->created_at)?->toISOString(),
                'user' => $measurement->user ? [
                    'id' => $measurement->user->id,
                    'email' => $measurement->user->email,
                    'first_name' => $measurement->user->first_name,
                    'last_name' => $measurement->user->last_name,
                ] : null,
            ];
        })->values();
    }

    private function primaryMetric(Measurement $measurement): array
    {
        foreach ($this->metricMap() as $column => $config) {
            if ($measurement->{$column} !== null) {
                return [
                    'type' => $column,
                    'label' => $config['label'],
                    'unit' => $config['unit'],
                    'value' => $measurement->{$column},
                ];
            }
        }

        return ['type' => 'none', 'label' => 'No metric', 'unit' => '', 'value' => null];
    }

    private function outlierSignal(Measurement $measurement, Collection $userRows): array
    {
        foreach ($this->metricMap() as $column => $config) {
            $value = $measurement->{$column};
            if ($value === null) {
                continue;
            }

            $numeric = (float) $value;
            if ($numeric < $config['min'] || $numeric > $config['max']) {
                return [
                    'flagged' => true,
                    'severity' => 'danger',
                    'reason' => "{$config['label']} is outside the expected human review range.",
                    'metric' => $column,
                ];
            }

            $previous = $userRows
                ->where('measured_at', '<', $measurement->measured_at)
                ->filter(fn (Measurement $row) => $row->{$column} !== null)
                ->sortByDesc('measured_at')
                ->first();

            if ($previous && abs($numeric - (float) $previous->{$column}) > $config['jump']) {
                return [
                    'flagged' => true,
                    'severity' => 'warning',
                    'reason' => "{$config['label']} changed sharply from the previous record.",
                    'metric' => $column,
                ];
            }
        }

        return [
            'flagged' => false,
            'severity' => 'success',
            'reason' => 'No suspicious movement detected.',
            'metric' => null,
        ];
    }

    private function selectedUserSummary(Collection $rows, ?int $userId): ?array
    {
        if (! $userId) {
            return null;
        }

        $userRows = $rows->where('user_id', $userId)->sortBy('measured_at')->values();
        $latest = $userRows->last();

        if (! $latest) {
            return null;
        }

        return [
            'user_id' => $userId,
            'user' => $latest['user'],
            'record_count' => $userRows->count(),
            'latest_date' => $latest['measured_at'],
            'latest_weight_kg' => $latest['weight_kg'],
            'latest_body_fat_pct' => $latest['body_fat_pct'],
            'outlier_count' => $userRows->filter(fn (array $row) => $row['outlier_signal']['flagged'])->count(),
            'manual_edit_count' => $userRows->where('manual_edit', true)->count(),
        ];
    }

    private function trendForUser(Collection $rows, ?int $userId): array
    {
        if (! $userId) {
            return [];
        }

        return $rows
            ->where('user_id', $userId)
            ->sortBy('measured_at')
            ->map(fn (array $row) => [
                'date' => $row['measured_at'],
                'weight_kg' => $row['weight_kg'],
                'body_fat_pct' => $row['body_fat_pct'],
                'waist_cm' => $row['waist_cm'],
                'manual_edit' => $row['manual_edit'],
                'outlier' => $row['outlier_signal']['flagged'],
            ])
            ->values()
            ->all();
    }

    private function adminLogMap(array $measurementIds): Collection
    {
        if ($measurementIds === []) {
            return collect();
        }

        return AdminActionLog::query()
            ->with('admin:id,first_name,last_name,name,email')
            ->where('target_type', Measurement::class)
            ->whereIn('target_id', $measurementIds)
            ->latest('created_at')
            ->get()
            ->groupBy('target_id');
    }

    private function metricColumns(): array
    {
        return array_keys($this->metricMap());
    }

    private function metricMap(): array
    {
        return [
            'weight_kg' => ['label' => 'Weight', 'unit' => 'kg', 'min' => 25, 'max' => 350, 'jump' => 8],
            'height_cm' => ['label' => 'Height', 'unit' => 'cm', 'min' => 80, 'max' => 240, 'jump' => 5],
            'body_fat_pct' => ['label' => 'Body fat', 'unit' => '%', 'min' => 2, 'max' => 70, 'jump' => 8],
            'waist_cm' => ['label' => 'Waist', 'unit' => 'cm', 'min' => 35, 'max' => 220, 'jump' => 10],
            'chest_cm' => ['label' => 'Chest', 'unit' => 'cm', 'min' => 40, 'max' => 220, 'jump' => 10],
            'hip_cm' => ['label' => 'Hip', 'unit' => 'cm', 'min' => 40, 'max' => 240, 'jump' => 10],
            'resting_hr' => ['label' => 'Resting HR', 'unit' => 'bpm', 'min' => 30, 'max' => 220, 'jump' => 30],
            'systolic_bp' => ['label' => 'Systolic BP', 'unit' => 'mmHg', 'min' => 70, 'max' => 260, 'jump' => 40],
            'diastolic_bp' => ['label' => 'Diastolic BP', 'unit' => 'mmHg', 'min' => 40, 'max' => 180, 'jump' => 30],
        ];
    }
}
