<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
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
    /**
     * Show the user's profile page with all props your React page needs.
     */
    public function edit(Request $request): Response
    {
        $u = $request->user();

        // --- Profile snapshot (what the page reads) ---
        $userProfile = [
            'first_name' => $u->first_name,
            'last_name'  => $u->last_name,
            'username'   => $u->username,
            'gender'     => $u->gender,
            'age'        => $u->age,
            'height_cm'  => $u->height_cm,
            'weight_kg'  => $u->weight_kg,
        ];

        // --- Map your single 'fitness_goal' + 'diet_name' to the UI's "prefs" shape ---
        $dietName = $u->diet_name;
        $knownDietSlugs = ['balanced','high_protein','low_carb','mediterranean','keto','vegan','vegetarian'];
        $slug = $dietName ? strtolower(str_replace([' ', '-'], ['_', '_'], trim($dietName))) : null;
        $dietType = in_array($slug, $knownDietSlugs, true) ? $slug : ($slug ? 'other' : null);
        $dietOther = $dietType === 'other' ? $dietName : null;

        $prefs = [
            'dietary_goal'  => $u->dietary_goal,
            'fitness_goals' => $u->fitness_goal ? [$u->fitness_goal] : [],
            'diet_type'     => $dietType,
            'diet_other'    => $dietOther,
            'allergies'     => is_array($u->allergies) ? $u->allergies : [],
        ];

        // --- Measurement histories (tolerant of schema differences) ---
        $weightHistory = [];
        $heightHistory = [];
        if (Schema::hasTable('measurements')) {
            // Preferred shape: user_id, date, type ('weight'|'height'), value (number)
            if (
                Schema::hasColumn('measurements', 'user_id') &&
                Schema::hasColumn('measurements', 'date') &&
                Schema::hasColumn('measurements', 'type') &&
                Schema::hasColumn('measurements', 'value')
            ) {
                $weightHistory = DB::table('measurements')
                    ->where('user_id', $u->id)->where('type', 'weight')
                    ->orderBy('date', 'desc')->limit(30)
                    ->get(['date', 'type', 'value'])
                    ->map(fn($r) => ['date' => $r->date, 'type' => 'weight', 'value' => (float) $r->value])
                    ->all();

                $heightHistory = DB::table('measurements')
                    ->where('user_id', $u->id)->where('type', 'height')
                    ->orderBy('date', 'desc')->limit(30)
                    ->get(['date', 'type', 'value'])
                    ->map(fn($r) => ['date' => $r->date, 'type' => 'height', 'value' => (float) $r->value])
                    ->all();

            // Fallback shape: separate weight_kg/height_cm columns
            } else {
                $rows = DB::table('measurements')
                    ->where('user_id', $u->id)
                    ->orderBy('date', 'desc')->limit(30)->get();

                foreach ($rows as $r) {
                    if (isset($r->weight_kg) && $r->weight_kg !== null) {
                        $weightHistory[] = ['date' => $r->date, 'type' => 'weight', 'value' => (float) $r->weight_kg];
                    }
                    if (isset($r->height_cm) && $r->height_cm !== null) {
                        $heightHistory[] = ['date' => $r->date, 'type' => 'height', 'value' => (float) $r->height_cm];
                    }
                }
            }
        }

        return Inertia::render('settings/profile', [
            'displayName'   => $u->first_name ?: ($u->username ?: ($u->name ?: $u->email)),
            'userProfile'   => $userProfile,
            'prefs'         => $prefs,
            'dietName'      => $dietName,
            'weightHistory' => $weightHistory,
            'heightHistory' => $heightHistory,
            'status'        => $request->session()->get('status'),
        ]);
    }

    /**
     * Save basic profile info (first/last/username/gender/age/height/weight).
     * Match your React "Save profile" action.
     */
    public function updateBasics(Request $request): RedirectResponse
    {
        $u = $request->user();

        $data = $request->validate([
            'first_name' => ['nullable','string','max:40'],
            'last_name'  => ['nullable','string','max:40'],
            'username'   => ['nullable','string','max:24','regex:/^[A-Za-z0-9_.]+$/', Rule::unique('users','username')->ignore($u->id)],
            'gender'     => ['nullable', Rule::in(['male','female','other'])],
            'age'        => ['nullable','integer','between:13,100'],
            'height_cm'  => ['nullable','integer','between:80,250'],
            'weight_kg'  => ['nullable','numeric','between:25,400'],
        ]);

        $u->fill($data)->save();

        return back()->with('status', 'profile-updated');
    }

    /**
     * Save preferences (diet, goals, allergies).
     * Maps your UI props back to your users table columns.
     */
    public function updatePrefs(Request $request): RedirectResponse
    {
        $u = $request->user();

        $data = $request->validate([
            'diet_type'       => ['nullable','string','max:60'],    // balanced/high_protein/.../other
            'diet_other'      => ['nullable','string','max:60'],    // free-text if 'other'
            'dietary_goal'    => ['nullable','string','max:60'],
            'fitness_goals'   => ['nullable','array'],
            'fitness_goals.*' => ['string','max:60'],
            'allergies'       => ['nullable','array'],
            'allergies.*'     => ['string','max:60'],
        ]);

        // Convert diet_type back to your diet_name column
        $dietName = null;
        if (!empty($data['diet_type'])) {
            $dietName = $data['diet_type'] === 'other'
                ? ($data['diet_other'] ?? null)
                : ucfirst(str_replace('_', ' ', $data['diet_type']));
        }

        $u->diet_name    = $dietName;
        $u->dietary_goal = $data['dietary_goal'] ?? null;
        // You store a single 'fitness_goal'; collapse array to first item
        $u->fitness_goal = isset($data['fitness_goals'][0]) ? $data['fitness_goals'][0] : null;
        $u->allergies    = $data['allergies'] ?? [];

        $u->save();

        return back()->with('status', 'prefs-updated');
    }

    /**
     * Store a new measurement (weight or height).
     * Supports both "type/value" schema and legacy weight_kg/height_cm columns.
     */
    public function storeMeasurement(Request $request): RedirectResponse
    {
        $u = $request->user();

        $data = $request->validate([
            'date'  => ['required','date'],
            'type'  => ['required', Rule::in(['weight','height'])],
            'value' => ['required','numeric','min:1'],
        ]);

        if (!Schema::hasTable('measurements')) {
            return back()->with('status', 'no-measurements-table');
        }

        // Preferred generic schema
        if (
            Schema::hasColumn('measurements', 'user_id') &&
            Schema::hasColumn('measurements', 'date') &&
            Schema::hasColumn('measurements', 'type') &&
            Schema::hasColumn('measurements', 'value')
        ) {
            DB::table('measurements')->insert([
                'user_id'    => $u->id,
                'date'       => $data['date'],
                'type'       => $data['type'],
                'value'      => $data['value'],
                'created_at' => now(),
                'updated_at' => now(),
            ]);

        // Fallback separate columns
        } else {
            if ($data['type'] === 'weight' && Schema::hasColumn('measurements', 'weight_kg')) {
                DB::table('measurements')->insert([
                    'user_id'    => $u->id,
                    'date'       => $data['date'],
                    'weight_kg'  => $data['value'],
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
                // Optionally keep on profile
                $u->weight_kg = $data['value']; $u->save();

            } elseif ($data['type'] === 'height' && Schema::hasColumn('measurements', 'height_cm')) {
                DB::table('measurements')->insert([
                    'user_id'    => $u->id,
                    'date'       => $data['date'],
                    'height_cm'  => $data['value'],
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
                $u->height_cm = $data['value']; $u->save();

            } else {
                return back()->with('status', 'measurements-schema-unknown');
            }
        }

        return back()->with('status', 'measurement-added');
    }

    /**
     * Keep your original delete (unchanged).
     */
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
