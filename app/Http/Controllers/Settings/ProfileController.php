<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Models\Measurement;
use App\Models\UserPref;
use App\Services\Ai\Planner\PlannerProfileSyncService;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class ProfileController extends Controller
{
    public function __construct(private readonly PlannerProfileSyncService $plannerProfiles) {}

    public function edit(Request $request): Response
    {
        $u = $request->user();
        $u->loadMissing(['prefs', 'medicalHistories']);

        $userProfile = [
            'first_name' => $u->first_name,
            'last_name' => $u->last_name,
            'username' => $u->username,
            'gender' => $u->gender,
            'age' => $u->age,
            'height_cm' => $u->height_cm,
            'weight_kg' => $u->weight_kg,
        ];

        // Map your stored fields -> prefs shape the React page expects
        $dietName = $u->diet_name;
        $settings = is_array($u->prefs?->settings) ? $u->prefs->settings : [];

        $knownDietSlugs = ['balanced', 'high_protein', 'low_carb', 'mediterranean', 'keto', 'vegan', 'vegetarian'];
        $slug = $dietName ? strtolower(str_replace([' ', '-'], ['_', '_'], trim($dietName))) : null;
        $dietType = in_array($slug, $knownDietSlugs, true) ? $slug : ($slug ? 'other' : null);
        $dietOther = $dietType === 'other' ? $dietName : null;
        $tableMedical = $u->medicalHistories
            ->where('is_active', true)
            ->where('kind', 'medical_condition')
            ->pluck('value')
            ->filter()
            ->values()
            ->all();
        $tableInjuries = $u->medicalHistories
            ->where('is_active', true)
            ->where('kind', 'injury')
            ->pluck('value')
            ->filter()
            ->values()
            ->all();
        $medicalHistoryText = trim((string) ($u->medical_history ?? ''));
        $medicalFromText = $medicalHistoryText !== ''
            ? array_values(array_unique(array_filter(array_map(
                fn ($part) => trim((string) $part),
                preg_split('/[\r\n,;]+/', $medicalHistoryText) ?: []
            ))))
            : [];

        $prefs = [
            'dietary_goal' => $u->dietary_goal,
            'fitness_goals' => $u->fitness_goal ? [$u->fitness_goal] : [],
            'diet_type' => $dietType,
            'diet_other' => $dietOther,
            'allergies' => is_array($u->allergies) ? $u->allergies : [],
            'workout_days_per_week' => $u->workout_days_per_week !== null ? (int) $u->workout_days_per_week : null,
            'workout_location' => $u->workout_location,
            'preferred_workout_days' => is_array($settings['preferred_workout_days'] ?? null) ? $settings['preferred_workout_days'] : [],
            'available_equipment' => is_array($settings['available_equipment'] ?? null) ? $settings['available_equipment'] : [],
            'injury_history' => array_values(array_unique(array_filter(array_map(
                fn ($item) => trim((string) $item),
                array_merge(
                    is_array($settings['injury_history'] ?? null) ? $settings['injury_history'] : [],
                    $tableInjuries
                )
            )))),
            'medical_conditions' => array_values(array_unique(array_filter(array_map(
                fn ($item) => trim((string) $item),
                array_merge($medicalFromText, $tableMedical)
            )))),
        ];

        // ✅ Your real measurements schema uses measured_at + weight_kg
        $weightHistory = [];
        $heightHistory = [];

        if (Schema::hasTable('measurements')) {
            $hasUserId = Schema::hasColumn('measurements', 'user_id');
            $hasMeasuredAt = Schema::hasColumn('measurements', 'measured_at');

            if ($hasUserId && $hasMeasuredAt) {
                // Weight history
                if (Schema::hasColumn('measurements', 'weight_kg')) {
                    $weightHistory = DB::table('measurements')
                        ->where('user_id', $u->id)
                        ->whereNotNull('weight_kg')
                        ->orderBy('measured_at', 'desc')
                        ->limit(60)
                        ->get(['measured_at', 'weight_kg'])
                        ->map(fn ($r) => [
                            'date' => (string) $r->measured_at, // React expects "date"
                            'type' => 'weight',
                            'value' => (float) $r->weight_kg,
                        ])
                        ->all();
                }

                // Height history (ONLY if your table has height_cm — your dump does not)
                if (Schema::hasColumn('measurements', 'height_cm')) {
                    $heightHistory = DB::table('measurements')
                        ->where('user_id', $u->id)
                        ->whereNotNull('height_cm')
                        ->orderBy('measured_at', 'desc')
                        ->limit(60)
                        ->get(['measured_at', 'height_cm'])
                        ->map(fn ($r) => [
                            'date' => (string) $r->measured_at,
                            'type' => 'height',
                            'value' => (float) $r->height_cm,
                        ])
                        ->all();
                }
            }
        }

        return Inertia::render('settings/profile', [
            'displayName' => $u->first_name ?: ($u->username ?: ($u->name ?: $u->email)),
            'userProfile' => $userProfile,
            'prefs' => $prefs,
            'dietName' => $dietName,
            'weightHistory' => $weightHistory,
            'heightHistory' => $heightHistory, // will be [] unless you add height_cm column
            'flash' => [
                'status' => session('status'),
                'success' => session('success'),
                'error' => session('error'),
            ],
        ]);
    }

    public function updateBasics(Request $request): RedirectResponse
    {
        $u = $request->user();

        $data = $request->validate([
            'first_name' => ['nullable', 'string', 'max:40'],
            'last_name' => ['nullable', 'string', 'max:40'],
            'username' => ['nullable', 'string', 'max:24', 'regex:/^[A-Za-z0-9_.]+$/', Rule::unique('users', 'username')->ignore($u->id)],
            'gender' => ['nullable', Rule::in(['male', 'female', 'other'])],
            'age' => ['nullable', 'integer', 'between:13,100'],

            // Keep these because your users table has them
            'height_cm' => ['nullable', 'integer', 'between:80,250'],
            'weight_kg' => ['nullable', 'numeric', 'between:25,400'],
        ]);

        $u->fill($data)->save();
        $this->plannerProfiles->prepare($u);

        return back()->with('status', 'profile-updated')->with('success', 'Profile updated.');
    }

    public function updatePrefs(Request $request): RedirectResponse
    {
        $u = $request->user();

        $data = $request->validate([
            'diet_type' => ['nullable', 'string', 'max:60'],
            'diet_other' => ['nullable', 'string', 'max:60'],
            'dietary_goal' => ['nullable', 'string', 'max:60'],
            'fitness_goals' => ['nullable', 'array'],
            'fitness_goals.*' => ['string', 'max:60'],
            'allergies' => ['nullable', 'array'],
            'allergies.*' => ['string', 'max:60'],
            'workout_days_per_week' => ['nullable', 'integer', 'min:1', 'max:7'],
            'workout_location' => ['nullable', Rule::in(['home', 'gym', 'both'])],
            'preferred_workout_days' => ['nullable', 'array'],
            'preferred_workout_days.*' => ['string', Rule::in(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])],
            'available_equipment' => ['nullable', 'array'],
            'available_equipment.*' => ['string', 'max:80'],
            'injury_history' => ['nullable', 'array'],
            'injury_history.*' => ['string', 'max:120'],
            'medical_conditions' => ['nullable', 'array'],
            'medical_conditions.*' => ['string', 'max:120'],
        ]);

        $dietName = null;
        if (! empty($data['diet_type'])) {
            $dietName = $data['diet_type'] === 'other'
                ? ($data['diet_other'] ?? null)
                : ucfirst(str_replace('_', ' ', $data['diet_type']));
        }

        $fitnessGoals = array_values(array_filter(array_unique(array_map(
            fn ($item) => trim((string) $item),
            is_array($data['fitness_goals'] ?? null) ? $data['fitness_goals'] : []
        ))));
        $allergies = array_values(array_filter(array_unique(array_map(
            fn ($item) => trim((string) $item),
            is_array($data['allergies'] ?? null) ? $data['allergies'] : []
        ))));
        $medicalConditions = array_values(array_filter(array_unique(array_map(
            fn ($item) => trim((string) $item),
            is_array($data['medical_conditions'] ?? null) ? $data['medical_conditions'] : []
        ))));
        $injuryHistory = array_values(array_filter(array_unique(array_map(
            fn ($item) => trim((string) $item),
            is_array($data['injury_history'] ?? null) ? $data['injury_history'] : []
        ))));
        $availableEquipment = array_values(array_filter(array_unique(array_map(
            fn ($item) => trim((string) $item),
            is_array($data['available_equipment'] ?? null) ? $data['available_equipment'] : []
        ))));
        $preferredWorkoutDays = array_values(array_filter(array_unique(array_map(
            fn ($item) => trim(strtolower((string) $item)),
            is_array($data['preferred_workout_days'] ?? null) ? $data['preferred_workout_days'] : []
        ))));

        $u->diet_name = $dietName;
        $u->dietary_goal = $data['dietary_goal'] ?? null;
        $u->fitness_goal = $fitnessGoals[0] ?? null;
        $u->allergies = $allergies;
        $u->workout_days_per_week = $data['workout_days_per_week'] ?? null;
        $u->workout_location = $data['workout_location'] ?? null;
        $u->has_medical_history = ($medicalConditions !== [] || $injuryHistory !== []);
        $u->medical_history = $medicalConditions !== [] ? implode(', ', $medicalConditions) : null;

        $u->save();

        $prefs = $u->prefs ?? new UserPref(['user_id' => $u->id]);
        $settings = is_array($prefs->settings) ? $prefs->settings : [];
        $settings['injury_history'] = $injuryHistory;
        $settings['available_equipment'] = $availableEquipment;
        $settings['preferred_workout_days'] = $preferredWorkoutDays;

        $prefs->fill([
            'user_id' => $u->id,
            'settings' => $settings,
        ])->save();

        $u->unsetRelation('prefs');
        $u->unsetRelation('medicalHistories');
        $u->unsetRelation('dietaryRestrictions');
        $this->plannerProfiles->prepare($u);

        return back()->with('status', 'prefs-updated')->with('success', 'Preferences updated.');
    }

    public function storeMeasurement(Request $request): RedirectResponse
    {
        $u = $request->user();

        $data = $request->validate([
            'date' => ['required', 'date'], // UI sends "date"
            'type' => ['required', Rule::in(['weight', 'height'])],
            'value' => ['required', 'numeric', 'min:1'],
        ]);

        if (! Schema::hasTable('measurements')) {
            return back()->with('error', 'Measurements table not found.');
        }

        // ✅ Your schema uses measured_at (date)
        $dateColumn = Schema::hasColumn('measurements', 'measured_at')
            ? 'measured_at'
            : (Schema::hasColumn('measurements', 'date') ? 'date' : null);

        if (! $dateColumn || ! Schema::hasColumn('measurements', 'user_id')) {
            return back()->with('error', 'Measurements schema is missing user_id/date fields.');
        }

        $normalizedDate = $dateColumn === 'measured_at'
            ? Carbon::parse($data['date'])->toDateString()
            : Carbon::parse($data['date'])->toDateString();

        // Weight path (supported by your dump)
        if ($data['type'] === 'weight') {
            if (! Schema::hasColumn('measurements', 'weight_kg')) {
                return back()->with('error', 'This database does not support weight_kg in measurements.');
            }

            // Upsert per (user_id, measured_at) — matches your unique index
            DB::table('measurements')->updateOrInsert(
                ['user_id' => $u->id, $dateColumn => $normalizedDate],
                ['weight_kg' => $data['value'], 'updated_at' => now(), 'created_at' => now()]
            );

            // Optional: keep latest on users table
            $u->weight_kg = $data['value'];
            $u->save();

            return back()->with('status', 'measurement-added')->with('success', 'Weight saved.');
        }

        // Height path (NOT supported by your dump unless you add height_cm column)
        if ($data['type'] === 'height') {
            // If you later add measurements.height_cm, this will work automatically:
            if (Schema::hasColumn('measurements', 'height_cm')) {
                DB::table('measurements')->updateOrInsert(
                    ['user_id' => $u->id, $dateColumn => $normalizedDate],
                    ['height_cm' => $data['value'], 'updated_at' => now(), 'created_at' => now()]
                );
                $u->height_cm = (int) $data['value'];
                $u->save();

                return back()->with('status', 'measurement-added')->with('success', 'Height saved.');
            }

            // Otherwise: store on user only (so UI still updates profile height)
            $u->height_cm = (int) $data['value'];
            $u->save();

            return back()->with('status', 'height-saved-user-only')
                ->with('success', 'Height saved. Height history will appear once the measurements table upgrade is applied.');
        }

        return back()->with('error', 'Unknown measurement type.');
    }

    public function destroy(Request $request): RedirectResponse
    {
        $request->validate([
            'password' => ['required', 'current_password'],
        ]);

        $user = $request->user();

        Auth::logout();

        $user->delete();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect('/');
    }
}
