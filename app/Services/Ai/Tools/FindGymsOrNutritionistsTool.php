<?php

namespace App\Services\Ai\Tools;

use App\Models\PlaceLocal;
use App\Models\User;

class FindGymsOrNutritionistsTool implements AiTool
{
    public function name(): string
    {
        return 'find_gyms_or_nutritionists';
    }

    public function description(): string
    {
        return 'Finds nearby gyms or nutritionists from local places/professionals for the user goal.';
    }

    public function schema(): array
    {
        return [
            'type' => 'object',
            'additionalProperties' => false,
            'properties' => [
                'lat' => ['type' => 'number'],
                'lng' => ['type' => 'number'],
                'goal' => ['type' => 'string'],
                'limit' => ['type' => 'integer', 'minimum' => 1, 'maximum' => 12],
            ],
        ];
    }

    public function execute(User $user, array $arguments): array
    {
        $lat = $this->toNullableFloat($arguments['lat'] ?? null);
        $lng = $this->toNullableFloat($arguments['lng'] ?? null);
        $goal = trim((string) ($arguments['goal'] ?? $user->fitness_goal ?? $user->dietary_goal ?? ''));
        $limit = max(1, min(12, (int) ($arguments['limit'] ?? 6)));
        $preferredCategory = $this->preferredCategoryForGoal($goal);

        $places = PlaceLocal::query()
            ->whereIn('category', ['gym', 'nutritionist'])
            ->orderBy('name')
            ->limit(120)
            ->get();

        $mappedPlaces = $places->map(function (PlaceLocal $place) use ($lat, $lng, $preferredCategory) {
            $distanceKm = null;
            if ($lat !== null && $lng !== null && is_numeric($place->lat) && is_numeric($place->lng)) {
                $distanceKm = $this->distanceKm($lat, $lng, (float) $place->lat, (float) $place->lng);
            }

            return [
                'name' => (string) $place->name,
                'category' => (string) $place->category,
                'address' => $place->address,
                'city' => $place->city,
                'lat' => is_numeric($place->lat) ? (float) $place->lat : null,
                'lng' => is_numeric($place->lng) ? (float) $place->lng : null,
                'google_maps_link' => $place->google_maps_link,
                'distance_km' => $distanceKm !== null ? round($distanceKm, 2) : null,
                'priority_score' => $this->priorityScore((string) $place->category, $distanceKm, $preferredCategory),
            ];
        })->sortBy([
            ['priority_score', 'desc'],
            ['distance_km', 'asc'],
            ['name', 'asc'],
        ])->values();

        if ($mappedPlaces->isEmpty()) {
            $professionals = User::query()
                ->whereIn('role', [User::ROLE_NUTRITIONIST, User::ROLE_TRAINER])
                ->whereNotNull('profile_lat')
                ->whereNotNull('profile_lng')
                ->limit(80)
                ->get();

            $mappedPlaces = $professionals->map(function (User $professional) use ($lat, $lng, $preferredCategory) {
                $distanceKm = null;
                if ($lat !== null && $lng !== null && is_numeric($professional->profile_lat) && is_numeric($professional->profile_lng)) {
                    $distanceKm = $this->distanceKm($lat, $lng, (float) $professional->profile_lat, (float) $professional->profile_lng);
                }

                $category = $professional->role === User::ROLE_NUTRITIONIST ? 'nutritionist' : 'gym';

                return [
                    'name' => (string) $professional->display_name,
                    'category' => $category,
                    'address' => $professional->city ? $professional->city.' area' : null,
                    'city' => $professional->city,
                    'lat' => is_numeric($professional->profile_lat) ? (float) $professional->profile_lat : null,
                    'lng' => is_numeric($professional->profile_lng) ? (float) $professional->profile_lng : null,
                    'google_maps_link' => null,
                    'distance_km' => $distanceKm !== null ? round($distanceKm, 2) : null,
                    'priority_score' => $this->priorityScore($category, $distanceKm, $preferredCategory),
                ];
            })->sortBy([
                ['priority_score', 'desc'],
                ['distance_km', 'asc'],
                ['name', 'asc'],
            ])->values();
        }

        return [
            'goal' => $goal !== '' ? $goal : null,
            'preferred_category' => $preferredCategory,
            'origin' => [
                'lat' => $lat,
                'lng' => $lng,
            ],
            'results' => $mappedPlaces->take($limit)->values()->all(),
            'count' => min($limit, $mappedPlaces->count()),
        ];
    }

    private function toNullableFloat(mixed $value): ?float
    {
        if (! is_numeric($value)) {
            return null;
        }

        return (float) $value;
    }

    private function preferredCategoryForGoal(string $goal): ?string
    {
        $goal = mb_strtolower(trim($goal));
        if ($goal === '') {
            return null;
        }

        if (str_contains($goal, 'weight') || str_contains($goal, 'nutrition') || str_contains($goal, 'diet')) {
            return 'nutritionist';
        }

        if (str_contains($goal, 'muscle') || str_contains($goal, 'strength') || str_contains($goal, 'workout')) {
            return 'gym';
        }

        return null;
    }

    private function priorityScore(string $category, ?float $distanceKm, ?string $preferredCategory): float
    {
        $score = 0.0;

        if ($preferredCategory !== null && $category === $preferredCategory) {
            $score += 2.0;
        }

        if ($distanceKm !== null) {
            $score += max(0, 1.5 - min(1.5, $distanceKm / 20.0));
        }

        return $score;
    }

    private function distanceKm(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $earthRadiusKm = 6371.0;
        $dLat = deg2rad($lat2 - $lat1);
        $dLng = deg2rad($lng2 - $lng1);
        $a = sin($dLat / 2) ** 2
            + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLng / 2) ** 2;
        $c = 2 * atan2(sqrt($a), sqrt(1 - $a));

        return $earthRadiusKm * $c;
    }
}
