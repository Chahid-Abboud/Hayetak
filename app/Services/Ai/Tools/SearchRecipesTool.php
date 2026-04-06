<?php

namespace App\Services\Ai\Tools;

use App\Models\Food;
use App\Models\User;
use App\Services\Ai\Profile\UserSafetyProfileResolver;

class SearchRecipesTool implements AiTool
{
    public function __construct(
        private readonly UserSafetyProfileResolver $safetyProfileResolver,
    ) {}

    public function name(): string
    {
        return 'search_recipes';
    }

    public function description(): string
    {
        return 'Searches meal/recipe options while respecting allergies, diet type, and available ingredients.';
    }

    public function schema(): array
    {
        return [
            'type' => 'object',
            'additionalProperties' => false,
            'properties' => [
                'query' => ['type' => 'string'],
                'constraints' => [
                    'type' => 'object',
                    'additionalProperties' => false,
                    'properties' => [
                        'diet_type' => ['type' => 'string'],
                        'allergies' => [
                            'type' => 'array',
                            'items' => ['type' => 'string'],
                        ],
                    ],
                ],
                'available_ingredients' => [
                    'type' => 'array',
                    'items' => ['type' => 'string'],
                ],
                'limit' => ['type' => 'integer', 'minimum' => 1, 'maximum' => 12],
            ],
        ];
    }

    public function execute(User $user, array $arguments): array
    {
        $profile = $this->safetyProfileResolver->resolve($user);
        $query = trim((string) ($arguments['query'] ?? ''));
        $constraints = is_array($arguments['constraints'] ?? null) ? $arguments['constraints'] : [];
        $dietType = strtolower(trim((string) ($constraints['diet_type'] ?? $profile['diet_type'] ?? '')));
        $allergies = $this->normalizeList($constraints['allergies'] ?? $profile['allergies'] ?? []);
        $availableIngredients = $this->normalizeList($arguments['available_ingredients'] ?? []);
        $limit = max(1, min(12, (int) ($arguments['limit'] ?? 6)));

        $builder = Food::query()
            ->select([
                'id',
                'name',
                'category',
                'cuisine',
                'serving_unit',
                'calories',
                'protein_g',
                'carbs_g',
                'fat_g',
                'ingredients',
                'allergens',
                'diets_allowed',
            ])
            ->orderBy('name');

        if ($query !== '') {
            $needle = mb_strtolower($query);
            $builder->where(function ($q) use ($needle) {
                $q->whereRaw('LOWER(name) LIKE ?', ['%'.$needle.'%'])
                    ->orWhereRaw('LOWER(category) LIKE ?', ['%'.$needle.'%'])
                    ->orWhereRaw('LOWER(cuisine) LIKE ?', ['%'.$needle.'%']);
            });
        }

        $rows = $builder->limit(80)->get();
        $results = [];
        $allergyNeedles = $this->allergyNeedles($allergies);
        $queryNeedles = $this->tokenize($query);

        foreach ($rows as $food) {
            $ingredients = $this->normalizeList($food->ingredients);
            $allowedDiets = array_map('mb_strtolower', $this->normalizeList($food->diets_allowed));
            $allergenList = array_map('mb_strtolower', $this->normalizeList($food->allergens));
            $searchText = mb_strtolower(implode(' ', array_filter([
                (string) $food->name,
                (string) $food->category,
                (string) $food->cuisine,
                implode(' ', $ingredients),
            ])));

            if ($dietType !== '' && $allowedDiets !== [] && ! $this->dietIsAllowed($dietType, $allowedDiets)) {
                continue;
            }

            if ($this->containsAny($searchText, $allergyNeedles) || $this->containsAnyList($allergenList, $allergyNeedles)) {
                continue;
            }

            $ingredientMatches = $this->countIngredientMatches($ingredients, $availableIngredients);
            $queryMatches = $queryNeedles === [] ? 0 : $this->countTokenMatches($searchText, $queryNeedles);
            $score = ($queryMatches * 2) + $ingredientMatches + ($dietType !== '' ? 1 : 0);

            $results[] = [
                'food_id' => (int) $food->id,
                'name' => (string) $food->name,
                'category' => $food->category,
                'cuisine' => $food->cuisine,
                'macros' => [
                    'calories_kcal' => (int) ($food->calories ?? 0),
                    'protein_g' => (float) ($food->protein_g ?? 0),
                    'carbs_g' => (float) ($food->carbs_g ?? 0),
                    'fat_g' => (float) ($food->fat_g ?? 0),
                ],
                'ingredients' => array_values($ingredients),
                'diets_allowed' => array_values($allowedDiets),
                'ingredient_match_count' => $ingredientMatches,
                'match_score' => $score,
            ];
        }

        usort($results, static function (array $a, array $b): int {
            if ($a['match_score'] === $b['match_score']) {
                return strcasecmp((string) $a['name'], (string) $b['name']);
            }

            return $b['match_score'] <=> $a['match_score'];
        });

        return [
            'query' => $query,
            'constraints' => [
                'diet_type' => $dietType !== '' ? $dietType : null,
                'allergies' => $allergies,
            ],
            'available_ingredients' => $availableIngredients,
            'recipes' => array_slice($results, 0, $limit),
            'count' => min($limit, count($results)),
        ];
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
            static fn ($item) => trim((string) $item),
            $value,
        ))));
    }

    private function tokenize(string $value): array
    {
        $value = mb_strtolower(trim($value));
        if ($value === '') {
            return [];
        }

        return array_values(array_filter(preg_split('/[\s,;]+/', $value) ?: []));
    }

    private function countTokenMatches(string $haystack, array $tokens): int
    {
        $count = 0;
        foreach ($tokens as $token) {
            if ($token !== '' && str_contains($haystack, $token)) {
                $count++;
            }
        }

        return $count;
    }

    private function countIngredientMatches(array $ingredients, array $availableIngredients): int
    {
        if ($ingredients === [] || $availableIngredients === []) {
            return 0;
        }

        $available = array_map('mb_strtolower', $availableIngredients);
        $count = 0;

        foreach ($ingredients as $ingredient) {
            $candidate = mb_strtolower((string) $ingredient);
            foreach ($available as $availableItem) {
                if ($availableItem !== '' && (str_contains($candidate, $availableItem) || str_contains($availableItem, $candidate))) {
                    $count++;
                    break;
                }
            }
        }

        return $count;
    }

    private function containsAny(string $haystack, array $needles): bool
    {
        foreach ($needles as $needle) {
            if ($needle !== '' && str_contains($haystack, $needle)) {
                return true;
            }
        }

        return false;
    }

    private function containsAnyList(array $haystack, array $needles): bool
    {
        foreach ($haystack as $item) {
            if ($this->containsAny((string) $item, $needles)) {
                return true;
            }
        }

        return false;
    }

    private function allergyNeedles(array $allergies): array
    {
        $needles = [];
        foreach ($allergies as $allergy) {
            $normalized = mb_strtolower(trim((string) $allergy));
            if ($normalized === '') {
                continue;
            }

            $needles[] = $normalized;
            if (str_ends_with($normalized, 's') && mb_strlen($normalized) > 4) {
                $needles[] = rtrim($normalized, 's');
            }
        }

        return array_values(array_unique($needles));
    }

    private function dietIsAllowed(string $dietType, array $allowedDiets): bool
    {
        if ($allowedDiets === []) {
            return true;
        }

        foreach ($allowedDiets as $allowedDiet) {
            if ($allowedDiet !== '' && (str_contains($allowedDiet, $dietType) || str_contains($dietType, $allowedDiet))) {
                return true;
            }
        }

        return false;
    }
}
