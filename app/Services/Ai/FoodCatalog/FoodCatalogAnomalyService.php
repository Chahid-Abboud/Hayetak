<?php

namespace App\Services\Ai\FoodCatalog;

use App\Models\Food;
use Illuminate\Support\Str;

class FoodCatalogAnomalyService
{
    /**
     * @return array<int, string>
     */
    public function blockedAiTags(): array
    {
        return [
            'catalog_anomaly',
            'invalid_for_ai_seed',
            'invalid_for_ai_search',
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function auditFood(Food $food): array
    {
        $reasons = [];

        if ($this->hasImpossibleBeverageMacros($food)) {
            $reasons[] = 'impossible_beverage_macros';
        }

        if ($this->hasImpossibleMacroProfile($food)) {
            $reasons[] = 'impossible_macro_profile';
        }

        if ($this->looksLikeUltraProcessedJunk($food)) {
            $reasons[] = 'ultra_processed_junk';
        }

        if ($this->looksLikeAlcohol($food)) {
            $reasons[] = 'alcohol';
        }

        $reasons = array_values(array_unique($reasons));

        return [
            'food_id' => (int) $food->id,
            'name' => (string) $food->name,
            'reasons' => $reasons,
            'existing_tags' => $this->normalizeList($food->tags),
            'has_block_tags' => $this->hasAiBlockTags($food),
            'blocked' => $reasons !== [] || $this->hasAiBlockTags($food),
        ];
    }

    public function shouldExcludeFromAiCatalog(Food $food): bool
    {
        return (bool) ($this->auditFood($food)['blocked'] ?? false);
    }

    public function hasAiBlockTags(Food $food): bool
    {
        $tags = array_map('mb_strtolower', $this->normalizeList($food->tags));

        foreach ($this->blockedAiTags() as $blockedTag) {
            if (in_array(mb_strtolower($blockedTag), $tags, true)) {
                return true;
            }
        }

        return false;
    }

    /**
     * @param  array<int, string>|null  $reasons
     * @return array<string, mixed>
     */
    public function applyAiBlockTags(Food $food, ?array $reasons = null): array
    {
        $audit = $this->auditFood($food);
        $reasons = array_values(array_unique($reasons ?? $audit['reasons'] ?? []));
        $currentTags = $this->normalizeList($food->tags);
        $updatedTags = array_values(array_unique(array_merge(
            $currentTags,
            $this->blockedAiTags(),
            $this->reasonTags($reasons),
        )));
        sort($updatedTags);

        $updated = false;
        if ($updatedTags !== $currentTags) {
            $food->forceFill(['tags' => $updatedTags])->save();
            $updated = true;
        }

        return [
            'food_id' => (int) $food->id,
            'name' => (string) $food->name,
            'reasons' => $reasons,
            'updated' => $updated,
            'tags' => $updatedTags,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function syncAiBlockTags(Food $food): array
    {
        $audit = $this->auditFood($food);
        $reasons = is_array($audit['reasons'] ?? null) ? array_values(array_unique($audit['reasons'])) : [];
        $currentTags = $this->normalizeList($food->tags);
        $nonAiTags = array_values(array_filter(
            $currentTags,
            fn (string $tag): bool => ! in_array($tag, $this->blockedAiTags(), true) && ! str_starts_with($tag, 'catalog_reason:')
        ));

        $updatedTags = $reasons !== []
            ? array_values(array_unique(array_merge($nonAiTags, $this->blockedAiTags(), $this->reasonTags($reasons))))
            : $nonAiTags;
        sort($updatedTags);

        $updated = false;
        if ($updatedTags !== $currentTags) {
            $food->forceFill(['tags' => $updatedTags])->save();
            $updated = true;
        }

        return [
            'food_id' => (int) $food->id,
            'name' => (string) $food->name,
            'reasons' => $reasons,
            'updated' => $updated,
            'tags' => $updatedTags,
            'blocked' => $reasons !== [],
        ];
    }

    private function hasImpossibleBeverageMacros(Food $food): bool
    {
        $name = $this->normalizeKey($food->name);
        $category = $this->normalizeKey((string) ($food->category ?? ''));
        $mealTypes = implode(' ', array_map(
            fn (string $value): string => $this->normalizeKey($value),
            $this->normalizeList($food->meal_types)
        ));

        $looksLikeDrink = Str::contains($mealTypes, 'drink')
            || Str::contains($name, [
                'tea',
                'juice',
                'smoothie',
                'cola',
                'lemonade',
                'kombucha',
                'energy drink',
                'drink',
                'milk',
                'ayran',
                'syrup',
                'red bull',
                'gatorade',
                'barbican',
                'arizona',
                'lipton',
                'pepsi',
                '7up',
                'schweppes',
                'malt',
                'water',
            ])
            || Str::contains($category, ['drink', 'beverage']);

        if (! $looksLikeDrink) {
            return false;
        }

        $calories = $food->calories !== null ? (float) $food->calories : null;
        $protein = (float) ($food->protein_g ?? 0);
        $fat = (float) ($food->fat_g ?? 0);

        if ($calories === null && ($protein > 12 || $fat > 8)) {
            return true;
        }

        return $calories !== null
            && $calories <= 40
            && ($protein > 12 || $fat > 8);
    }

    private function hasImpossibleMacroProfile(Food $food): bool
    {
        $calories = $food->calories !== null ? (float) $food->calories : null;
        $protein = (float) ($food->protein_g ?? 0);
        $carbs = (float) ($food->carbs_g ?? 0);
        $fat = (float) ($food->fat_g ?? 0);
        $macroCalories = ($protein * 4) + ($carbs * 4) + ($fat * 9);

        if ($calories === null && ($macroCalories >= 180 || $protein > 30 || $fat > 18 || $carbs > 45)) {
            return true;
        }

        return $calories !== null
            && $calories > 0
            && $macroCalories > (($calories * 1.9) + 120);
    }

    private function looksLikeUltraProcessedJunk(Food $food): bool
    {
        $text = $this->normalizeKey($food->name.' '.(string) ($food->category ?? ''));

        return Str::contains($text, [
            'gandour',
            'haribo',
            'goldbears',
            'gummy',
            'rice pops',
            'snickers',
            'kitkat',
            'oreo',
            'pringles',
            'doritos',
            'cheetos',
            'nutella',
            'bonjus',
            'chips',
            'wafer',
            'candy',
            'chocolate bar',
            'cola',
            'soda',
            'ice cream',
            'ramen',
            'ramyun',
            'instant noodle',
            'instant noodles',
            'indomie',
        ]);
    }

    private function looksLikeAlcohol(Food $food): bool
    {
        $text = $this->normalizeKey($food->name.' '.(string) ($food->category ?? ''));
        $tokens = preg_split('/\s+/', $text) ?: [];
        $needleSet = [
            'vodka' => true,
            'beer' => true,
            'wine' => true,
            'whiskey' => true,
            'arak' => true,
            'gin' => true,
            'rum' => true,
            'tequila' => true,
        ];

        foreach ($tokens as $token) {
            if (isset($needleSet[$token])) {
                return true;
            }
        }

        return false;
    }

    /**
     * @param  array<int, string>  $reasons
     * @return array<int, string>
     */
    private function reasonTags(array $reasons): array
    {
        return array_map(
            static fn (string $reason): string => 'catalog_reason:'.$reason,
            array_values(array_filter($reasons))
        );
    }

    private function normalizeKey(?string $value): string
    {
        return Str::of((string) $value)
            ->lower()
            ->replaceMatches('/[^a-z0-9]+/u', ' ')
            ->squish()
            ->value();
    }

    /**
     * @return array<int, string>
     */
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
