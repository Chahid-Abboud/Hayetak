<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AdminActionLog;
use App\Models\Food;
use App\Models\FoodFavorite;
use App\Models\MealEntry;
use App\Models\NutritionPlanItem;
use App\Services\AdminActionLogger;
use App\Services\Ai\FoodCatalog\FoodCatalogAnomalyService;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class AdminMealController extends Controller
{
    public function __construct(
        private readonly AdminActionLogger $logger,
        private readonly FoodCatalogAnomalyService $anomalies,
    ) {}

    public function foods(Request $request): JsonResponse
    {
        $q = trim((string) $request->query('q', ''));
        $category = trim((string) $request->query('category', ''));
        $suitability = trim((string) $request->query('suitability', 'all'));

        $baseQuery = Food::query();

        $statsRows = (clone $baseQuery)->get();
        $stats = $this->foodStats($statsRows);
        $categories = (clone $baseQuery)
            ->whereNotNull('category')
            ->where('category', '!=', '')
            ->distinct()
            ->orderBy('category')
            ->pluck('category')
            ->values();

        $rows = $baseQuery
            ->when($q !== '', function ($query) use ($q) {
                $query->where(function ($inner) use ($q) {
                    $inner
                        ->where('name', 'like', "%{$q}%")
                        ->orWhere('category', 'like', "%{$q}%")
                        ->orWhere('serving_unit', 'like', "%{$q}%");
                });
            })
            ->when($category !== '', fn ($query) => $query->where('category', $category))
            ->orderBy('name')
            ->paginate((int) $request->query('per_page', 20));

        $duplicateNames = $this->duplicateNameMap($statsRows);
        $rows->setCollection($rows->getCollection()->map(
            fn (Food $food) => $this->serializeFood($food, $duplicateNames)
        )->when($suitability !== 'all', function ($collection) use ($suitability) {
            return $collection->filter(fn (array $food) => $food['planner_suitability'] === $suitability)->values();
        }));

        return response()->json([
            ...$rows->toArray(),
            'stats' => $stats,
            'filters' => [
                'categories' => $categories,
            ],
        ]);
    }

    public function upsertFood(Request $request, ?Food $food = null): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:191'],
            'brand' => ['nullable', 'string', 'max:191'],
            'category' => ['nullable', 'string', 'max:120'],
            'calories' => ['nullable', 'integer', 'min:0'],
            'protein_g' => ['nullable', 'numeric', 'min:0'],
            'carbs_g' => ['nullable', 'numeric', 'min:0'],
            'fat_g' => ['nullable', 'numeric', 'min:0'],
            'fiber_g' => ['nullable', 'numeric', 'min:0'],
            'sugar_g' => ['nullable', 'numeric', 'min:0'],
            'sodium_mg' => ['nullable', 'integer', 'min:0'],
            'cholesterol_mg' => ['nullable', 'integer', 'min:0'],
            'serving_size' => ['nullable', 'numeric', 'min:0.01'],
            'serving_unit' => ['nullable', 'string', 'max:32'],
            'allergens' => ['nullable', 'array'],
            'allergens.*' => ['string', 'max:80'],
            'diets_allowed' => ['nullable', 'array'],
            'diets_allowed.*' => ['string', 'max:80'],
            'tags' => ['nullable', 'array'],
            'tags.*' => ['string', 'max:80'],
            'meal_types' => ['nullable', 'array'],
            'meal_types.*' => ['string', 'in:breakfast,lunch,dinner,snack,drink'],
        ]);

        $model = $food ?: new Food;
        $model->fill($data)->save();

        $this->logger->log($request->user()->id, $food ? 'admin.food.update' : 'admin.food.create', $model, $data);

        return response()->json(['ok' => true, 'food' => $model], $food ? 200 : 201);
    }

    public function destroyFood(Request $request, Food $food): JsonResponse
    {
        $data = $request->validate([
            'reason' => ['nullable', 'string', 'max:2000'],
        ]);

        $payload = $food->only(['id', 'name', 'category']);

        try {
            $food->delete();
        } catch (QueryException) {
            return response()->json([
                'message' => 'This food is used by meal logs or plans. Merge it into another catalog item before deleting.',
            ], 422);
        }

        $this->logger->log($request->user()->id, 'admin.food.delete', null, [
            ...$payload,
            'reason' => $data['reason'] ?? null,
        ]);

        return response()->json(['ok' => true]);
    }

    public function hideFood(Request $request, Food $food): JsonResponse
    {
        $data = $request->validate([
            'reason' => ['nullable', 'string', 'max:2000'],
        ]);

        $tags = array_values(array_unique(array_merge(
            $this->normalizeList($food->tags),
            ['invalid_for_ai_search', 'admin_hidden']
        )));
        sort($tags);

        $food->forceFill(['tags' => $tags])->save();

        $this->logger->log($request->user()->id, 'admin.food.hide', $food, [
            'reason' => $data['reason'] ?? null,
            'tags' => $tags,
        ]);

        return response()->json(['ok' => true, 'food' => $this->serializeFood($food->fresh(), [])]);
    }

    public function mergeFood(Request $request, Food $food): JsonResponse
    {
        $data = $request->validate([
            'target_food_id' => ['required', 'integer', 'exists:foods,id'],
            'reason' => ['nullable', 'string', 'max:2000'],
        ]);

        abort_if((int) $data['target_food_id'] === (int) $food->id, 422, 'Choose a different target food.');

        $target = Food::query()->findOrFail((int) $data['target_food_id']);

        DB::transaction(function () use ($food, $target) {
            MealEntry::query()->where('food_id', $food->id)->update(['food_id' => $target->id]);
            NutritionPlanItem::query()->where('food_id', $food->id)->update(['food_id' => $target->id]);
            FoodFavorite::query()->where('food_id', $food->id)->delete();
            $food->delete();
        });

        $this->logger->log($request->user()->id, 'admin.food.merge_duplicate', $target, [
            'source_food_id' => $food->id,
            'source_name' => $food->name,
            'target_food_id' => $target->id,
            'target_name' => $target->name,
            'reason' => $data['reason'] ?? null,
        ]);

        return response()->json(['ok' => true, 'target' => $this->serializeFood($target->fresh(), [])]);
    }

    public function mealEntries(Request $request): JsonResponse
    {
        $userId = $request->query('user_id');
        $mealType = trim((string) $request->query('meal_type', ''));
        $search = trim((string) $request->query('search', ''));
        $date = trim((string) $request->query('date', ''));

        $stats = [
            'recent_logs' => MealEntry::query()->count(),
            'edited_logs' => AdminActionLog::query()
                ->where('target_type', MealEntry::class)
                ->where('action', 'admin.meal_entry.update')
                ->count(),
            'deleted_logs' => AdminActionLog::query()
                ->where('action', 'admin.meal_entry.delete')
                ->count(),
            'missing_food_logs' => MealEntry::query()->doesntHave('food')->count(),
        ];

        $rows = MealEntry::query()
            ->with(['user:id,email,first_name,last_name', 'food'])
            ->when($userId, fn ($q) => $q->where('user_id', (int) $userId))
            ->when($mealType !== '', fn ($q) => $q->where('meal_type', $mealType))
            ->when($date !== '', fn ($q) => $q->whereDate('eaten_at', $date))
            ->when($search !== '', function ($query) use ($search) {
                $like = '%'.$search.'%';

                $query->where(function ($subQuery) use ($like) {
                    $subQuery
                        ->whereHas('user', function ($userQuery) use ($like) {
                            $userQuery
                                ->where('email', 'like', $like)
                                ->orWhere('first_name', 'like', $like)
                                ->orWhere('last_name', 'like', $like);
                        })
                        ->orWhereHas('food', function ($foodQuery) use ($like) {
                            $foodQuery->where('name', 'like', $like);
                        });
                });
            })
            ->latest('id')
            ->paginate((int) $request->query('per_page', 30));

        $entryIds = $rows->getCollection()->pluck('id')->all();
        $logs = AdminActionLog::query()
            ->with('admin:id,first_name,last_name,name,email')
            ->where('target_type', MealEntry::class)
            ->whereIn('target_id', $entryIds)
            ->latest('created_at')
            ->get()
            ->groupBy('target_id');

        $rows->setCollection($rows->getCollection()->map(
            fn (MealEntry $entry) => $this->serializeMealEntry($entry, $logs->get($entry->id, collect()))
        ));

        return response()->json([
            ...$rows->toArray(),
            'stats' => $stats,
            'restore_supported' => false,
        ]);
    }

    public function updateMealEntry(Request $request, MealEntry $mealEntry): JsonResponse
    {
        $data = $request->validate([
            'meal_type' => ['sometimes', 'in:breakfast,lunch,dinner,snack,drink'],
            'servings' => ['sometimes', 'numeric', 'min:0.01', 'max:1000'],
            'eaten_at' => ['sometimes', 'date'],
            'reason' => ['nullable', 'string', 'max:2000'],
        ]);

        $before = $mealEntry->only(['meal_type', 'servings', 'eaten_at']);
        $mealEntry->update(collect($data)->except('reason')->all());
        $this->logger->log($request->user()->id, 'admin.meal_entry.update', $mealEntry, [
            'before' => $before,
            'after' => $mealEntry->only(['meal_type', 'servings', 'eaten_at']),
            'reason' => $data['reason'] ?? null,
        ]);

        return response()->json(['ok' => true, 'meal_entry' => $mealEntry->fresh()]);
    }

    private function serializeMealEntry(MealEntry $entry, $logs): array
    {
        $latestLog = $logs->first();
        $latestUpdate = $logs->firstWhere('action', 'admin.meal_entry.update');
        $servings = (float) $entry->servings;
        $food = $entry->food;

        return [
            'id' => $entry->id,
            'user_id' => $entry->user_id,
            'food_id' => $entry->food_id,
            'meal_type' => $entry->meal_type,
            'servings' => $entry->servings,
            'eaten_at' => optional($entry->eaten_at)?->toDateString() ?? (string) $entry->eaten_at,
            'source' => $entry->nutrition_plan_item_id ? 'planner' : 'manual',
            'nutrition_plan_item_id' => $entry->nutrition_plan_item_id,
            'user' => $entry->user ? [
                'id' => $entry->user->id,
                'email' => $entry->user->email,
                'first_name' => $entry->user->first_name,
                'last_name' => $entry->user->last_name,
            ] : null,
            'food' => $food ? [
                'id' => $food->id,
                'name' => $food->name,
                'category' => $food->category,
                'serving_unit' => $food->serving_unit,
                'calories' => $food->calories,
                'protein_g' => $food->protein_g,
                'carbs_g' => $food->carbs_g,
                'fat_g' => $food->fat_g,
            ] : null,
            'macros' => [
                'calories' => $food?->calories !== null ? round(((float) $food->calories) * $servings, 1) : null,
                'protein_g' => $food?->protein_g !== null ? round(((float) $food->protein_g) * $servings, 1) : null,
                'carbs_g' => $food?->carbs_g !== null ? round(((float) $food->carbs_g) * $servings, 1) : null,
                'fat_g' => $food?->fat_g !== null ? round(((float) $food->fat_g) * $servings, 1) : null,
            ],
            'original_values' => $latestUpdate?->metadata['before'] ?? $entry->only(['meal_type', 'servings', 'eaten_at']),
            'edited_values' => $entry->only(['meal_type', 'servings', 'eaten_at']),
            'last_edited_by' => $latestLog?->admin ? [
                'id' => $latestLog->admin->id,
                'name' => $latestLog->admin->display_name,
                'email' => $latestLog->admin->email,
            ] : null,
            'last_audit_action' => $latestLog?->action,
            'last_audit_at' => optional($latestLog?->created_at)?->toISOString(),
            'audit_note' => $latestLog?->metadata['reason'] ?? null,
            'audit_metadata' => $latestLog?->metadata,
            'audit_history' => $logs->take(5)->map(fn (AdminActionLog $log) => [
                'id' => $log->id,
                'action' => $log->action,
                'created_at' => optional($log->created_at)?->toISOString(),
                'admin' => $log->admin ? [
                    'id' => $log->admin->id,
                    'name' => $log->admin->display_name,
                    'email' => $log->admin->email,
                ] : null,
                'metadata' => $log->metadata,
            ])->values(),
        ];
    }

    public function destroyMealEntry(Request $request, MealEntry $mealEntry): JsonResponse
    {
        $data = $request->validate([
            'reason' => ['nullable', 'string', 'max:2000'],
        ]);

        $payload = $mealEntry->only(['id', 'user_id', 'food_id']);
        $mealEntry->delete();
        $this->logger->log($request->user()->id, 'admin.meal_entry.delete', null, [
            ...$payload,
            'reason' => $data['reason'] ?? null,
        ]);

        return response()->json(['ok' => true]);
    }

    private function serializeFood(Food $food, array $duplicateNames): array
    {
        $audit = $this->anomalies->auditFood($food);
        $tags = $this->normalizeList($food->tags);
        $duplicateKey = $this->normalizeFoodName($food->name);
        $duplicateCount = $duplicateNames[$duplicateKey] ?? 0;
        $hasCoreMacros = $food->calories !== null
            && $food->protein_g !== null
            && $food->carbs_g !== null
            && $food->fat_g !== null;
        $hidden = in_array('admin_hidden', $tags, true) || in_array('invalid_for_ai_search', $tags, true);

        return [
            'id' => $food->id,
            'name' => $food->name,
            'brand' => $food->brand,
            'category' => $food->category,
            'serving_size' => $food->serving_size,
            'serving_unit' => $food->serving_unit,
            'calories' => $food->calories,
            'protein_g' => $food->protein_g,
            'carbs_g' => $food->carbs_g,
            'fat_g' => $food->fat_g,
            'fiber_g' => $food->fiber_g,
            'sugar_g' => $food->sugar_g,
            'sodium_mg' => $food->sodium_mg,
            'cholesterol_mg' => $food->cholesterol_mg,
            'allergens' => $this->normalizeList($food->allergens),
            'diets_allowed' => $this->normalizeList($food->diets_allowed),
            'tags' => $tags,
            'meal_types' => $this->normalizeList($food->meal_types),
            'visibility' => $hidden ? 'hidden' : 'visible',
            'planner_suitability' => $hidden || ($audit['blocked'] ?? false) || ! $hasCoreMacros ? 'needs_review' : 'suitable',
            'planner_warnings' => array_values(array_filter([
                ...($audit['reasons'] ?? []),
                $hasCoreMacros ? null : 'missing_core_macros',
                $food->serving_unit ? null : 'missing_serving_unit',
            ])),
            'duplicate_warning' => $duplicateCount > 1 ? "{$duplicateCount} catalog entries share this normalized name." : null,
        ];
    }

    private function foodStats($foods): array
    {
        $duplicateMap = $this->duplicateNameMap($foods);

        return [
            'total' => $foods->count(),
            'missing_macros' => $foods->filter(fn (Food $food) => $food->calories === null || $food->protein_g === null || $food->carbs_g === null || $food->fat_g === null)->count(),
            'missing_allergens' => $foods->filter(fn (Food $food) => $this->normalizeList($food->allergens) === [])->count(),
            'planner_review' => $foods->filter(fn (Food $food) => (bool) ($this->anomalies->auditFood($food)['blocked'] ?? false))->count(),
            'duplicate_groups' => collect($duplicateMap)->filter(fn (int $count) => $count > 1)->count(),
        ];
    }

    private function duplicateNameMap($foods): array
    {
        return $foods
            ->groupBy(fn (Food $food) => $this->normalizeFoodName($food->name))
            ->map(fn ($group) => $group->count())
            ->all();
    }

    private function normalizeFoodName(?string $value): string
    {
        return Str::of((string) $value)->lower()->replaceMatches('/[^a-z0-9]+/u', ' ')->squish()->value();
    }

    private function normalizeList(mixed $value): array
    {
        if (is_string($value)) {
            $decoded = json_decode($value, true);
            $value = is_array($decoded) ? $decoded : preg_split('/[\r\n,;]+/', $value);
        }

        if (! is_array($value)) {
            return [];
        }

        return array_values(array_unique(array_filter(array_map(
            static fn ($item): string => trim((string) $item),
            $value,
        ))));
    }
}
