<?php

namespace App\Services\Ai\Plan;

use App\Models\Exercise;
use App\Models\User;
use App\Models\UserPref;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ExerciseSafetyFilter
{
    /**
     * Build an allow-list of exercises enforcing:
     * - injuries from user_prefs.settings['injuries'] (Option A)
     * - equipment from user_prefs.settings['available_equipment'] (Option A)
     * - workout_location (home vs gym)
     * - restrictions table (exercise_restrictions + restrictions.code)
     *
     * Returns:
     * [
     *   'allowed_exercise_ids' => int[],
     *   'caution_exercise_ids' => int[],
     *   'catalog' => array[] // lightweight exercise catalog for model
     * ]
     */
    public function build(User $user, int $limitCatalog = 2000): array
    {
        $pref = UserPref::query()->where('user_id', $user->id)->first();
        $settings = (array) ($pref?->settings ?? []);

        $injuries = $this->normalizeArray($settings['injuries'] ?? []);
        $availableEquipment = $this->normalizeArray($settings['available_equipment'] ?? []);

        $location = $this->normalizeOne($user->workout_location); // home/gym/etc.
        $isHome = $location ? Str::contains($location, 'home') : false;

        // 1) Determine exercise IDs that are blocked by restrictions for this user's injuries.
        // We'll treat matching restriction codes as:
        // - severity='avoid' => exclude
        // - severity='caution' => allow but mark caution
        $restrictionMap = $this->getRestrictionMapForUserInjuries($injuries);

        // 2) Pull exercises
        $exercises = Exercise::query()
            ->select([
                'id', 'name', 'primary_muscle', 'equipment', 'equipment_list',
                'difficulty', 'movement_pattern', 'exercise_type', 'mechanic', 'plane',
                'home_friendly', 'conditions',
            ])
            ->orderBy('id')
            ->get();

        $allowed = [];
        $caution = [];
        $catalog = [];

        foreach ($exercises as $ex) {
            $id = (int) $ex->id;

            // Restriction severity logic
            if (isset($restrictionMap['avoid'][$id])) {
                continue; // excluded
            }

            $isCaution = isset($restrictionMap['caution'][$id]);

            // Home/Gym filtering
            if ($isHome) {
                // If home: allow only home_friendly OR equipment requirements satisfied by available equipment
                if (! $ex->home_friendly && ! $this->equipmentSatisfied($ex, $availableEquipment)) {
                    continue;
                }
            } else {
                // If gym: still enforce equipment if the user provided a list.
                // If user didn't specify equipment, assume gym has access.
                if (! empty($availableEquipment) && ! $this->equipmentSatisfied($ex, $availableEquipment)) {
                    continue;
                }
            }

            // Optional: if you want to enforce injury hints stored in exercises.conditions too
            // (e.g., ["knee_pain"] etc). We'll exclude if overlap.
            $conditions = $this->normalizeArray($ex->conditions ?? []);
            if (! empty($injuries) && $this->hasIntersection($injuries, $conditions)) {
                // treat as caution by default, not full exclude
                $isCaution = true;
            }

            $allowed[] = $id;
            if ($isCaution) {
                $caution[] = $id;
            }

            if (count($catalog) < $limitCatalog) {
                $catalog[] = [
                    'id' => $id,
                    'name' => (string) $ex->name,
                    'primary_muscle' => $ex->primary_muscle,
                    'difficulty' => $ex->difficulty,
                    'equipment' => $ex->equipment,
                    'equipment_list' => $ex->equipment_list ?? [],
                    'home_friendly' => (bool) $ex->home_friendly,
                    'movement_pattern' => $ex->movement_pattern,
                    'exercise_type' => $ex->exercise_type,
                    'mechanic' => $ex->mechanic,
                    'plane' => $ex->plane,
                    'caution' => $isCaution,
                ];
            }
        }

        return [
            'allowed_exercise_ids' => $allowed,
            'caution_exercise_ids' => array_values(array_unique($caution)),
            'catalog' => $catalog,
        ];
    }

    /**
     * Returns:
     * [
     *   'avoid' => [exercise_id => true, ...],
     *   'caution' => [exercise_id => true, ...],
     * ]
     */
    private function getRestrictionMapForUserInjuries(array $injuries): array
    {
        if (empty($injuries)) {
            return ['avoid' => [], 'caution' => []];
        }

        // restrictions.code should match injury keys (normalized)
        $rows = DB::table('exercise_restrictions as er')
            ->join('restrictions as r', 'r.id', '=', 'er.restriction_id')
            ->whereIn(DB::raw('LOWER(r.code)'), $injuries)
            ->select(['er.exercise_id', 'er.severity'])
            ->get();

        $avoid = [];
        $caution = [];

        foreach ($rows as $row) {
            $eid = (int) $row->exercise_id;
            $sev = $this->normalizeOne($row->severity) ?? 'caution';

            if ($sev === 'avoid') {
                $avoid[$eid] = true;
            } else {
                // default to caution
                $caution[$eid] = true;
            }
        }

        // If avoid exists, it overrides caution.
        foreach ($avoid as $eid => $_) {
            unset($caution[$eid]);
        }

        return ['avoid' => $avoid, 'caution' => $caution];
    }

    private function equipmentSatisfied(Exercise $ex, array $availableEquipment): bool
    {
        // If user didn't provide equipment list, don't block.
        if (empty($availableEquipment)) {
            return true;
        }

        // equipment_list is preferred (jsonb array)
        $req = $this->normalizeArray($ex->equipment_list ?? []);

        // fallback to legacy equipment string
        if (empty($req)) {
            $legacy = $this->normalizeOne($ex->equipment);
            if (! $legacy) {
                return true;
            }

            // bodyweight/none always allowed
            if (in_array($legacy, ['bodyweight', 'none', 'no_equipment'], true)) {
                return true;
            }

            // single equipment match
            return in_array($legacy, $availableEquipment, true);
        }

        // If exercise requires only bodyweight/none, allow
        if (count($req) === 1 && in_array($req[0], ['bodyweight', 'none', 'no_equipment'], true)) {
            return true;
        }

        // Require ALL listed equipment items to be available (safe default)
        foreach ($req as $needed) {
            if (in_array($needed, ['bodyweight', 'none', 'no_equipment'], true)) {
                continue;
            }
            if (! in_array($needed, $availableEquipment, true)) {
                return false;
            }
        }

        return true;
    }

    private function hasIntersection(array $a, array $b): bool
    {
        if (empty($a) || empty($b)) {
            return false;
        }

        $set = array_flip($a);
        foreach ($b as $x) {
            if (isset($set[$x])) {
                return true;
            }
        }

        return false;
    }

    private function normalizeOne($value): ?string
    {
        if ($value === null) {
            return null;
        }
        $s = trim((string) $value);
        if ($s === '') {
            return null;
        }

        return Str::of($s)->lower()->replace(' ', '_')->replace('-', '_')->__toString();
    }

    private function normalizeArray($value): array
    {
        if ($value === null) {
            return [];
        }
        if (is_string($value)) {
            $value = [$value];
        }
        if (! is_array($value)) {
            return [];
        }

        $out = [];
        foreach ($value as $v) {
            $n = $this->normalizeOne($v);
            if ($n !== null) {
                $out[] = $n;
            }
        }

        return array_values(array_unique($out));
    }
}
