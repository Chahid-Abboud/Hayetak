<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

class AdminSafetyProfileController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $search = trim((string) $request->query('search', ''));
        $risk = trim((string) $request->query('risk', 'all'));
        $profile = trim((string) $request->query('profile', 'all'));

        $users = User::query()
            ->where('role', '!=', User::ROLE_ADMIN)
            ->with([
                'prefs:id,user_id,settings',
                'dietaryRestrictions' => fn ($query) => $query
                    ->where('is_active', true)
                    ->orderBy('kind')
                    ->orderBy('value'),
                'medicalHistories' => fn ($query) => $query
                    ->where('is_active', true)
                    ->orderBy('kind')
                    ->orderBy('value'),
            ])
            ->withCount(['aiPlans', 'aiConversations'])
            ->when($search !== '', function ($query) use ($search) {
                $like = '%'.$search.'%';

                $query->where(function ($subQuery) use ($like) {
                    $subQuery
                        ->where('name', 'like', $like)
                        ->orWhere('email', 'like', $like)
                        ->orWhere('first_name', 'like', $like)
                        ->orWhere('last_name', 'like', $like)
                        ->orWhere('diet_name', 'like', $like)
                        ->orWhere('medical_history', 'like', $like);
                });
            })
            ->latest('id')
            ->limit(80)
            ->get()
            ->map(fn (User $user) => $this->profilePayload($user))
            ->filter(function (array $payload) use ($risk, $profile) {
                if ($risk !== 'all' && $payload['risk_level'] !== $risk) {
                    return false;
                }

                return match ($profile) {
                    'allergies' => $payload['allergies'] !== [],
                    'medical' => $payload['medical_conditions'] !== [],
                    'injury' => $payload['injuries'] !== [],
                    'incomplete' => $payload['incomplete_onboarding'] !== [],
                    'contradictions' => $payload['contradictions'] !== [],
                    default => true,
                };
            })
            ->values();

        return response()->json([
            'stats' => [
                'total' => $users->count(),
                'danger' => $users->where('risk_level', 'danger')->count(),
                'warning' => $users->where('risk_level', 'warning')->count(),
                'allergy_profiles' => $users->filter(fn (array $row) => $row['allergies'] !== [])->count(),
                'incomplete' => $users->filter(fn (array $row) => $row['incomplete_onboarding'] !== [])->count(),
            ],
            'profiles' => $users,
        ]);
    }

    private function profilePayload(User $user): array
    {
        $settings = is_array($user->prefs?->settings) ? $user->prefs->settings : [];
        $dietaryRestrictions = $user->dietaryRestrictions;
        $medicalHistories = $user->medicalHistories;

        $allergies = $this->uniqueStrings(array_merge(
            is_array($user->allergies) ? $user->allergies : [],
            $this->restrictionValues($dietaryRestrictions, 'allergy'),
        ));

        $dietType = trim((string) ($user->diet_name ?? ''));
        $dietTypes = $this->uniqueStrings(array_merge(
            $dietType !== '' ? [$dietType] : [],
            $this->restrictionValues($dietaryRestrictions, 'diet_type'),
        ));

        $avoidances = $this->restrictionValues($dietaryRestrictions, 'avoidance');
        $injuries = $this->uniqueStrings(array_merge(
            $this->medicalValues($medicalHistories, 'injury'),
            $this->normalizeList($settings['injury_history'] ?? []),
        ));
        $medicalConditions = $this->uniqueStrings(array_merge(
            $this->medicalValues($medicalHistories, 'medical_condition'),
            (bool) $user->has_medical_history && filled($user->medical_history)
                ? [$user->medical_history]
                : [],
        ));
        $equipment = $this->normalizeList($settings['available_equipment'] ?? []);

        $blockedFoods = $this->blockedFoods($allergies, $dietTypes, $avoidances);
        $blockedExercises = $this->blockedExercises($injuries, $equipment, (string) ($user->workout_location ?? ''));
        $equipmentLimits = $this->equipmentLimits($equipment, (string) ($user->workout_location ?? ''));
        $incomplete = $this->incompleteFields($user, $equipment);
        $contradictions = $this->contradictions($user, $dietTypes, $injuries, $equipment);
        $mustAvoid = $this->uniqueStrings(array_merge($blockedFoods, $blockedExercises));

        $riskLevel = $this->riskLevel($allergies, $medicalConditions, $injuries, $incomplete, $contradictions);

        return [
            'id' => $user->id,
            'name' => $user->display_name,
            'email' => $user->email,
            'role' => $user->role,
            'risk_level' => $riskLevel,
            'status' => $user->status,
            'verified' => (bool) $user->verified,
            'diet_type' => $dietTypes[0] ?? null,
            'allergies' => $allergies,
            'medical_conditions' => $medicalConditions,
            'injuries' => $injuries,
            'blocked_foods' => $blockedFoods,
            'blocked_exercises' => $blockedExercises,
            'equipment_limits' => $equipmentLimits,
            'available_equipment' => $equipment,
            'incomplete_onboarding' => $incomplete,
            'contradictions' => $contradictions,
            'ai_must_avoid' => $mustAvoid,
            'plan_status' => [
                'ai_plans' => (int) ($user->ai_plans_count ?? 0),
                'ai_conversations' => (int) ($user->ai_conversations_count ?? 0),
                'planner_generation' => $riskLevel === 'danger' ? 'review_before_generation' : 'allowed_with_constraints',
            ],
            'review_state' => 'needs_review',
        ];
    }

    private function riskLevel(array $allergies, array $medicalConditions, array $injuries, array $incomplete, array $contradictions): string
    {
        if ($contradictions !== [] || $allergies !== [] || $injuries !== []) {
            return 'danger';
        }

        if ($medicalConditions !== [] || $incomplete !== []) {
            return 'warning';
        }

        return 'info';
    }

    private function restrictionValues(Collection $rows, string $kind): array
    {
        return $this->uniqueStrings($rows
            ->where('kind', $kind)
            ->pluck('value')
            ->all());
    }

    private function medicalValues(Collection $rows, string $kind): array
    {
        return $this->uniqueStrings($rows
            ->where('kind', $kind)
            ->pluck('value')
            ->all());
    }

    private function blockedFoods(array $allergies, array $dietTypes, array $avoidances): array
    {
        $blocked = array_merge($allergies, $avoidances);
        $dietText = Str::lower(implode(' ', $dietTypes));

        if (str_contains($dietText, 'vegan')) {
            $blocked = array_merge($blocked, ['meat', 'poultry', 'fish', 'eggs', 'dairy', 'whey', 'honey']);
        } elseif (str_contains($dietText, 'vegetarian')) {
            $blocked = array_merge($blocked, ['meat', 'poultry', 'fish']);
        } elseif (str_contains($dietText, 'pescatarian')) {
            $blocked = array_merge($blocked, ['meat', 'poultry']);
        }

        if (str_contains($dietText, 'halal')) {
            $blocked = array_merge($blocked, ['pork', 'alcohol']);
        }

        if (str_contains($dietText, 'low fodmap')) {
            $blocked = array_merge($blocked, ['high-FODMAP trigger foods unless user confirms tolerance']);
        }

        return $this->uniqueStrings($blocked);
    }

    private function blockedExercises(array $injuries, array $equipment, string $workoutLocation): array
    {
        $blocked = [];
        $injuryText = Str::lower(implode(' ', $injuries));

        if (str_contains($injuryText, 'back')) {
            $blocked = array_merge($blocked, ['heavy deadlifts', 'loaded spinal flexion', 'max-effort back squats']);
        }

        if (str_contains($injuryText, 'knee')) {
            $blocked = array_merge($blocked, ['deep loaded squats', 'jump-heavy plyometrics', 'high-impact running']);
        }

        if (str_contains($injuryText, 'shoulder')) {
            $blocked = array_merge($blocked, ['heavy overhead pressing', 'upright rows', 'behind-the-neck presses']);
        }

        if (str_contains($injuryText, 'ankle')) {
            $blocked = array_merge($blocked, ['jump rope', 'box jumps', 'unstable single-leg hops']);
        }

        if (str_contains($injuryText, 'wrist')) {
            $blocked = array_merge($blocked, ['loaded wrist extension', 'standard pushups without handles']);
        }

        if (Str::lower($workoutLocation) === 'home' && $equipment === []) {
            $blocked[] = 'gym-machine-only exercises';
        }

        return $this->uniqueStrings($blocked);
    }

    private function equipmentLimits(array $equipment, string $workoutLocation): array
    {
        if ($equipment !== []) {
            return $this->uniqueStrings($equipment);
        }

        return match (Str::lower($workoutLocation)) {
            'home' => ['home setup not specified; default to bodyweight and low-equipment options'],
            'gym' => ['gym access saved; confirm machines/free weights before prescribing'],
            'both' => ['home and gym saved; choose alternatives for each setting'],
            default => ['equipment not recorded'],
        };
    }

    private function incompleteFields(User $user, array $equipment): array
    {
        $missing = [];

        if (blank($user->diet_name)) {
            $missing[] = 'diet type';
        }

        if (blank($user->fitness_goal)) {
            $missing[] = 'fitness goal';
        }

        if (blank($user->workout_location)) {
            $missing[] = 'workout location';
        }

        if ((string) ($user->workout_location ?? '') === 'home' && $equipment === []) {
            $missing[] = 'available home equipment';
        }

        return $missing;
    }

    private function contradictions(User $user, array $dietTypes, array $injuries, array $equipment): array
    {
        $issues = [];
        $dietText = Str::lower(implode(' ', $dietTypes));

        if (str_contains($dietText, 'vegan') && str_contains(Str::lower((string) $user->dietary_goal), 'high-protein')) {
            $issues[] = 'vegan diet with high-protein goal requires plant-protein specificity';
        }

        if ((string) ($user->workout_location ?? '') === 'home' && collect($equipment)->contains(fn ($item) => Str::contains(Str::lower((string) $item), ['machine', 'cable']))) {
            $issues[] = 'home workout location includes gym-machine equipment';
        }

        if ($injuries !== [] && ! (bool) $user->has_medical_history) {
            $issues[] = 'injury history exists but medical-history flag is off';
        }

        return $issues;
    }

    private function normalizeList(mixed $value): array
    {
        if (! is_array($value)) {
            return [];
        }

        return $this->uniqueStrings($value);
    }

    private function uniqueStrings(array $values): array
    {
        return array_values(array_unique(array_filter(array_map(
            fn ($value) => trim((string) $value),
            $values,
        ))));
    }
}
