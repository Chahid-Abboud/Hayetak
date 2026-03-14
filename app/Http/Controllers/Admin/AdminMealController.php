<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Food;
use App\Models\MealEntry;
use App\Services\AdminActionLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminMealController extends Controller
{
    public function __construct(private readonly AdminActionLogger $logger) {}

    public function foods(Request $request): JsonResponse
    {
        $q = trim((string) $request->query('q', ''));
        $rows = Food::query()
            ->when($q !== '', fn ($qq) => $qq->where('name', 'ILIKE', "%{$q}%"))
            ->orderBy('name')
            ->paginate((int) $request->query('per_page', 20));

        return response()->json($rows);
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
            'serving_size' => ['nullable', 'numeric', 'min:0.01'],
            'serving_unit' => ['nullable', 'string', 'max:32'],
        ]);

        $model = $food ?: new Food;
        $model->fill($data)->save();

        $this->logger->log($request->user()->id, $food ? 'admin.food.update' : 'admin.food.create', $model, $data);

        return response()->json(['ok' => true, 'food' => $model], $food ? 200 : 201);
    }

    public function destroyFood(Request $request, Food $food): JsonResponse
    {
        $payload = $food->only(['id', 'name', 'category']);
        $food->delete();
        $this->logger->log($request->user()->id, 'admin.food.delete', null, $payload);

        return response()->json(['ok' => true]);
    }

    public function mealEntries(Request $request): JsonResponse
    {
        $userId = $request->query('user_id');
        $rows = MealEntry::query()
            ->with(['user:id,email,first_name,last_name', 'food:id,name'])
            ->when($userId, fn ($q) => $q->where('user_id', (int) $userId))
            ->latest('id')
            ->paginate((int) $request->query('per_page', 30));

        return response()->json($rows);
    }

    public function updateMealEntry(Request $request, MealEntry $mealEntry): JsonResponse
    {
        $data = $request->validate([
            'meal_type' => ['sometimes', 'in:breakfast,lunch,dinner,snack,drink'],
            'servings' => ['sometimes', 'numeric', 'min:0.01', 'max:1000'],
            'eaten_at' => ['sometimes', 'date'],
        ]);

        $before = $mealEntry->only(['meal_type', 'servings', 'eaten_at']);
        $mealEntry->update($data);
        $this->logger->log($request->user()->id, 'admin.meal_entry.update', $mealEntry, ['before' => $before, 'after' => $mealEntry->only(['meal_type', 'servings', 'eaten_at'])]);

        return response()->json(['ok' => true, 'meal_entry' => $mealEntry->fresh()]);
    }

    public function destroyMealEntry(Request $request, MealEntry $mealEntry): JsonResponse
    {
        $payload = $mealEntry->only(['id', 'user_id', 'food_id']);
        $mealEntry->delete();
        $this->logger->log($request->user()->id, 'admin.meal_entry.delete', null, $payload);

        return response()->json(['ok' => true]);
    }
}

