<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->string('data_origin', 32)
                ->default('real')
                ->after('status')
                ->index();
        });

        DB::table('users')
            ->select('id', 'email')
            ->orderBy('id')
            ->chunkById(200, function ($users): void {
                foreach ($users as $user) {
                    $origin = $this->resolveOrigin((int) $user->id, (string) ($user->email ?? ''));

                    DB::table('users')
                        ->where('id', $user->id)
                        ->update([
                            'data_origin' => $origin,
                            'updated_at' => now(),
                        ]);
                }
            });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->dropIndex(['data_origin']);
            $table->dropColumn('data_origin');
        });
    }

    private function resolveOrigin(int $userId, string $email): string
    {
        if ($this->hasImportedPlannerEvidence($userId)) {
            return 'imported_real';
        }

        if ($this->hasSyntheticSeedEvidence($userId)) {
            return 'seeded_demo';
        }

        $normalizedEmail = strtolower(trim($email));
        if ($normalizedEmail !== '' && str_contains($normalizedEmail, 'example.')) {
            return 'test';
        }

        return 'real';
    }

    private function hasImportedPlannerEvidence(int $userId): bool
    {
        $prefSettings = DB::table('user_prefs')
            ->where('user_id', $userId)
            ->value('settings');

        if ($this->jsonFieldHasImportSource($prefSettings)) {
            return true;
        }

        $requestRows = DB::table('ai_requests')
            ->where('user_id', $userId)
            ->where('type', 'plan_generator')
            ->get(['usage_json', 'input_context_json']);

        foreach ($requestRows as $row) {
            if (
                $this->jsonFieldHasImportSource($row->usage_json ?? null)
                || $this->jsonFieldHasImportSource($row->input_context_json ?? null)
            ) {
                return true;
            }
        }

        return DB::table('measurements')
            ->where('user_id', $userId)
            ->where(function ($query): void {
                $query->where('notes', 'like', '%Imported planner%')
                    ->orWhere('notes', 'like', '%[source=planner_dataset_import]%')
                    ->orWhere('notes', 'like', '%planner_dataset_import%');
            })
            ->exists();
    }

    private function hasSyntheticSeedEvidence(int $userId): bool
    {
        if (DB::table('measurements')
            ->where('user_id', $userId)
            ->whereRaw("LOWER(COALESCE(notes, '')) LIKE 'synthetic_%'")
            ->exists()) {
            return true;
        }

        if (DB::table('workout_logs')
            ->where('user_id', $userId)
            ->whereRaw("LOWER(COALESCE(notes, '')) LIKE 'synthetic_%'")
            ->exists()) {
            return true;
        }

        if (DB::table('workout_log_sets as ws')
            ->join('workout_logs as wl', 'wl.id', '=', 'ws.workout_log_id')
            ->where('wl.user_id', $userId)
            ->where(function ($query): void {
                $query->whereRaw("LOWER(COALESCE(ws.notes, '')) LIKE 'synthetic_%'")
                    ->orWhereRaw("LOWER(COALESCE(wl.notes, '')) LIKE 'synthetic_%'");
            })
            ->exists()) {
            return true;
        }

        return DB::table('meal_logs')
            ->where('user_id', $userId)
            ->whereRaw("LOWER(COALESCE(other_notes, '')) LIKE 'synthetic_%'")
            ->exists();
    }

    private function jsonFieldHasImportSource(mixed $value): bool
    {
        if (is_array($value)) {
            $decoded = $value;
        } elseif (is_string($value) && $value !== '') {
            $decoded = json_decode($value, true);
        } else {
            $decoded = null;
        }

        return is_array($decoded) && trim((string) ($decoded['import_source'] ?? '')) !== '';
    }
};
