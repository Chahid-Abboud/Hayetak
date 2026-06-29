<?php

namespace App\Http\Controllers;

use App\Models\Measurement;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class UserMeasurementController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $limit = max(10, min(120, (int) $request->query('limit', 90)));

        $measurements = Measurement::query()
            ->where('user_id', $request->user()->id)
            ->orderByDesc('measured_at')
            ->orderByDesc('id')
            ->limit($limit)
            ->get();

        return response()->json([
            'data' => $measurements->map(fn (Measurement $measurement): array => $this->serialize($measurement))->values(),
            'summary' => $this->summary($measurements),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'measured_at' => ['nullable', 'date'],
            'date' => ['nullable', 'date'],
            'type' => ['nullable', Rule::in(['weight', 'height'])],
            'value' => ['nullable', 'numeric', 'min:1'],
            'weight_kg' => ['nullable', 'numeric', 'between:25,400'],
            'height_cm' => ['nullable', 'integer', 'between:80,250'],
            'body_fat_pct' => ['nullable', 'numeric', 'between:1,80'],
            'waist_cm' => ['nullable', 'numeric', 'between:20,250'],
            'hip_cm' => ['nullable', 'numeric', 'between:20,250'],
            'neck_cm' => ['nullable', 'numeric', 'between:15,100'],
            'chest_cm' => ['nullable', 'numeric', 'between:30,250'],
            'arm_cm' => ['nullable', 'numeric', 'between:10,100'],
            'thigh_cm' => ['nullable', 'numeric', 'between:15,150'],
            'calf_cm' => ['nullable', 'numeric', 'between:10,100'],
            'resting_hr' => ['nullable', 'integer', 'between:30,220'],
            'systolic_bp' => ['nullable', 'integer', 'between:70,260'],
            'diastolic_bp' => ['nullable', 'integer', 'between:40,180'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $measuredAt = Carbon::parse($data['measured_at'] ?? $data['date'] ?? now())->toDateString();
        $updates = $this->measurementUpdates($data);
        $metricUpdates = array_diff_key($updates, ['notes' => true]);

        if ($metricUpdates === []) {
            return response()->json([
                'message' => 'Add at least one measurement value.',
                'errors' => [
                    'value' => ['Add at least one measurement value.'],
                ],
            ], 422);
        }

        $measurement = Measurement::query()->updateOrCreate(
            [
                'user_id' => $request->user()->id,
                'measured_at' => $measuredAt,
            ],
            $updates
        );

        $userUpdates = [];
        if (array_key_exists('weight_kg', $updates)) {
            $userUpdates['weight_kg'] = $updates['weight_kg'];
        }
        if (array_key_exists('height_cm', $updates)) {
            $userUpdates['height_cm'] = $updates['height_cm'];
        }
        if ($userUpdates !== []) {
            $request->user()->forceFill($userUpdates)->save();
        }

        return response()->json([
            'ok' => true,
            'measurement' => $this->serialize($measurement->fresh()),
        ], 201);
    }

    public function destroy(Request $request, Measurement $measurement): JsonResponse
    {
        abort_unless($measurement->user_id === $request->user()->id, 403);

        $measurement->delete();

        return response()->json(['ok' => true]);
    }

    private function measurementUpdates(array $data): array
    {
        $updates = [];

        if (($data['type'] ?? null) === 'weight' && array_key_exists('value', $data)) {
            $updates['weight_kg'] = $data['value'];
        }

        if (($data['type'] ?? null) === 'height' && array_key_exists('value', $data)) {
            $updates['height_cm'] = (int) $data['value'];
        }

        foreach ([
            'weight_kg',
            'height_cm',
            'body_fat_pct',
            'waist_cm',
            'hip_cm',
            'neck_cm',
            'chest_cm',
            'arm_cm',
            'thigh_cm',
            'calf_cm',
            'resting_hr',
            'systolic_bp',
            'diastolic_bp',
            'notes',
        ] as $field) {
            if (array_key_exists($field, $data) && $data[$field] !== null && $data[$field] !== '') {
                $updates[$field] = $data[$field];
            }
        }

        return $updates;
    }

    private function summary($measurements): array
    {
        $latestWeight = $measurements->first(fn (Measurement $measurement): bool => $measurement->weight_kg !== null);
        $latestHeight = $measurements->first(fn (Measurement $measurement): bool => $measurement->height_cm !== null);
        $weightRows = $measurements
            ->filter(fn (Measurement $measurement): bool => $measurement->weight_kg !== null)
            ->sortBy('measured_at')
            ->values();
        $firstWeight = $weightRows->first();
        $lastWeight = $weightRows->last();

        return [
            'latest_weight_kg' => $latestWeight?->weight_kg !== null ? (float) $latestWeight->weight_kg : null,
            'latest_weight_date' => $latestWeight?->measured_at?->toDateString(),
            'latest_height_cm' => $latestHeight?->height_cm !== null ? (int) $latestHeight->height_cm : null,
            'latest_height_date' => $latestHeight?->measured_at?->toDateString(),
            'weight_change_kg' => ($firstWeight && $lastWeight && $firstWeight->id !== $lastWeight->id)
                ? round(((float) $lastWeight->weight_kg) - ((float) $firstWeight->weight_kg), 2)
                : null,
            'total_measurements' => $measurements->count(),
        ];
    }

    private function serialize(?Measurement $measurement): array
    {
        if (! $measurement) {
            return [];
        }

        return [
            'id' => (int) $measurement->id,
            'measured_at' => $measurement->measured_at?->toDateString(),
            'weight_kg' => $measurement->weight_kg !== null ? (float) $measurement->weight_kg : null,
            'height_cm' => $measurement->height_cm !== null ? (int) $measurement->height_cm : null,
            'body_fat_pct' => $measurement->body_fat_pct !== null ? (float) $measurement->body_fat_pct : null,
            'waist_cm' => $measurement->waist_cm !== null ? (float) $measurement->waist_cm : null,
            'hip_cm' => $measurement->hip_cm !== null ? (float) $measurement->hip_cm : null,
            'neck_cm' => $measurement->neck_cm !== null ? (float) $measurement->neck_cm : null,
            'chest_cm' => $measurement->chest_cm !== null ? (float) $measurement->chest_cm : null,
            'arm_cm' => $measurement->arm_cm !== null ? (float) $measurement->arm_cm : null,
            'thigh_cm' => $measurement->thigh_cm !== null ? (float) $measurement->thigh_cm : null,
            'calf_cm' => $measurement->calf_cm !== null ? (float) $measurement->calf_cm : null,
            'resting_hr' => $measurement->resting_hr !== null ? (int) $measurement->resting_hr : null,
            'systolic_bp' => $measurement->systolic_bp !== null ? (int) $measurement->systolic_bp : null,
            'diastolic_bp' => $measurement->diastolic_bp !== null ? (int) $measurement->diastolic_bp : null,
            'notes' => $measurement->notes,
        ];
    }
}
