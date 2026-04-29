<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;

class RestoreUsersFromSqlDump extends Command
{
    protected $signature = 'users:restore-from-sql-dump
        {path : Absolute or relative path to the SQL dump file}
        {--emails= : Optional comma-separated email list to restore}
        {--dry-run=0 : Preview missing users without writing them}
    ';

    protected $description = 'Restore missing users from a dumped users SQL table export.';

    public function handle(): int
    {
        $pathInput = trim((string) $this->argument('path'));
        $dumpPath = $this->resolvePath($pathInput);
        $dryRun = ((int) $this->option('dry-run')) === 1;
        $emailFilter = $this->emailFilter((string) $this->option('emails'));

        if (! File::exists($dumpPath)) {
            $this->error("SQL dump not found: {$dumpPath}");

            return self::FAILURE;
        }

        $rows = $this->parseDump($dumpPath);
        if ($rows === []) {
            $this->error('No users were parsed from the SQL dump.');

            return self::FAILURE;
        }

        $existingByEmail = User::withTrashed()
            ->get(['id', 'email', 'username', 'deleted_at'])
            ->keyBy(fn (User $user): string => strtolower((string) $user->email));

        $restoreRows = [];
        foreach ($rows as $row) {
            $email = strtolower((string) ($row['email'] ?? ''));
            if ($email === '') {
                continue;
            }

            if ($emailFilter !== [] && ! in_array($email, $emailFilter, true)) {
                continue;
            }

            $existing = $existingByEmail->get($email);
            if ($existing && $existing->deleted_at === null) {
                continue;
            }

            $restoreRows[] = [
                'source' => $row,
                'existing' => $existing,
            ];
        }

        if ($restoreRows === []) {
            $this->info('No missing users were found for restoration.');

            return self::SUCCESS;
        }

        $this->line('Users ready to restore: '.count($restoreRows));
        foreach ($restoreRows as $candidate) {
            $source = $candidate['source'];
            $this->line(sprintf(
                '- %s (%s)',
                (string) ($source['email'] ?? ''),
                (string) ($source['role'] ?? 'client')
            ));
        }

        if ($dryRun) {
            $this->info('Dry run complete. No users were written.');

            return self::SUCCESS;
        }

        $restored = [];
        $updated = [];

        DB::transaction(function () use ($restoreRows, &$restored, &$updated): void {
            foreach ($restoreRows as $candidate) {
                /** @var User|null $existing */
                $existing = $candidate['existing'];
                $payload = $this->buildInsertPayload($candidate['source'], $existing?->id);

                if ($existing) {
                    DB::table('users')
                        ->where('id', $existing->id)
                        ->update($payload);

                    $updated[] = [
                        'id' => $existing->id,
                        'email' => $payload['email'],
                    ];

                    continue;
                }

                $newId = DB::table('users')->insertGetId($payload);
                $restored[] = [
                    'id' => $newId,
                    'email' => $payload['email'],
                ];
            }
        });

        $this->info(sprintf(
            'Restored %d new users and updated %d soft-deleted users.',
            count($restored),
            count($updated)
        ));

        $actualEmailRestores = array_values(array_filter(
            array_merge($restored, $updated),
            fn (array $row): bool => $this->looksLikeActualEmail((string) ($row['email'] ?? ''))
        ));

        if ($actualEmailRestores !== []) {
            $this->line('Restored actual-email accounts:');
            foreach ($actualEmailRestores as $row) {
                $this->line(sprintf('- #%d %s', (int) $row['id'], (string) $row['email']));
            }
        }

        return self::SUCCESS;
    }

    private function resolvePath(string $pathInput): string
    {
        if ($pathInput === '') {
            return '';
        }

        if (preg_match('/^[A-Za-z]:\\\\/', $pathInput) === 1 || str_starts_with($pathInput, '\\')) {
            return $pathInput;
        }

        return base_path($pathInput);
    }

    /**
     * @return list<string>
     */
    private function emailFilter(string $raw): array
    {
        return collect(preg_split('/[\s,;]+/', trim($raw)) ?: [])
            ->map(static fn (string $email): string => strtolower(trim($email)))
            ->filter()
            ->unique()
            ->values()
            ->all();
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function parseDump(string $dumpPath): array
    {
        $rows = [];

        foreach (preg_split('/\r\n|\r|\n/', (string) File::get($dumpPath)) as $line) {
            $line = trim($line);
            if (! str_starts_with($line, 'INSERT INTO "public"."users"')) {
                continue;
            }

            if (! preg_match('/\((.*?)\)\s+VALUES\s+\((.*)\);$/', $line, $matches)) {
                continue;
            }

            $columns = array_map(
                static fn (string $column): string => trim($column, "\" \t\n\r\0\x0B"),
                explode(', ', $matches[1])
            );
            $values = $this->splitSqlValues($matches[2]);

            if (count($columns) !== count($values)) {
                continue;
            }

            $row = [];
            foreach ($columns as $index => $column) {
                $row[$column] = $this->decodeSqlLiteral($values[$index]);
            }

            $rows[] = $row;
        }

        return $rows;
    }

    /**
     * @return list<string>
     */
    private function splitSqlValues(string $raw): array
    {
        $values = [];
        $buffer = '';
        $length = strlen($raw);
        $inQuote = false;

        for ($index = 0; $index < $length; $index++) {
            $char = $raw[$index];

            if ($inQuote) {
                if ($char === '\\' && ($index + 1) < $length) {
                    $buffer .= $raw[$index + 1];
                    $index++;

                    continue;
                }

                if ($char === "'") {
                    if (($index + 1) < $length && $raw[$index + 1] === "'") {
                        $buffer .= "'";
                        $index++;

                        continue;
                    }

                    $inQuote = false;

                    continue;
                }

                $buffer .= $char;

                continue;
            }

            if ($char === "'") {
                $inQuote = true;

                continue;
            }

            if ($char === ',') {
                $values[] = trim($buffer);
                $buffer = '';

                continue;
            }

            $buffer .= $char;
        }

        $values[] = trim($buffer);

        return $values;
    }

    private function decodeSqlLiteral(string $value): mixed
    {
        $trimmed = trim($value);

        if ($trimmed === '' || strtoupper($trimmed) === 'NULL') {
            return null;
        }

        if ($trimmed === 'true') {
            return true;
        }

        if ($trimmed === 'false') {
            return false;
        }

        return $trimmed;
    }

    /**
     * @param  array<string, mixed>  $row
     * @return array<string, mixed>
     */
    private function buildInsertPayload(array $row, ?int $existingUserId = null): array
    {
        $email = strtolower(trim((string) ($row['email'] ?? '')));
        $firstName = $this->nullableString($row['first_name'] ?? null);
        $lastName = $this->nullableString($row['last_name'] ?? null);
        $name = $this->nullableString($row['name'] ?? null);
        $username = $this->uniqueUsername(
            $this->nullableString($row['username'] ?? null),
            $email,
            $existingUserId
        );

        return [
            'name' => $name ?: $this->fallbackDisplayName($firstName, $lastName, $email),
            'email' => $email,
            'email_verified_at' => $this->nullableString($row['email_verified_at'] ?? null),
            'password' => (string) ($row['password'] ?? ''),
            'remember_token' => $this->nullableString($row['remember_token'] ?? null),
            'created_at' => $this->nullableString($row['created_at'] ?? null),
            'updated_at' => $this->nullableString($row['updated_at'] ?? null) ?: now(),
            'two_factor_secret' => $this->nullableString($row['two_factor_secret'] ?? null),
            'two_factor_recovery_codes' => $this->nullableString($row['two_factor_recovery_codes'] ?? null),
            'two_factor_confirmed_at' => $this->nullableString($row['two_factor_confirmed_at'] ?? null),
            'first_name' => $firstName,
            'last_name' => $lastName,
            'username' => $username,
            'gender' => $this->nullableString($row['gender'] ?? null),
            'age' => $this->toIntOrNull($row['age'] ?? null),
            'height_cm' => $this->toIntOrNull($row['height_cm'] ?? null),
            'weight_kg' => $this->toDecimalOrNull($row['weight_kg'] ?? null),
            'has_medical_history' => (bool) ($row['has_medical_history'] ?? false),
            'medical_history' => $this->nullableString($row['medical_history'] ?? null),
            'dietary_goal' => $this->nullableString($row['dietary_goal'] ?? null),
            'fitness_goal' => $this->nullableString($row['fitness_goal'] ?? null),
            'diet_name' => $this->nullableString($row['diet_name'] ?? null),
            'allergies' => $this->jsonColumn($row['allergies'] ?? null),
            'activity_level' => $this->nullableString($row['activity_level'] ?? null),
            'workout_days_per_week' => $this->toIntOrNull($row['workout_days_per_week'] ?? null),
            'workout_location' => $this->nullableString($row['workout_location'] ?? null),
            'tried_diet_before' => $this->toBoolOrNull($row['tried_diet_before'] ?? null),
            'diet_failure_reasons' => $this->jsonColumn($row['diet_failure_reasons'] ?? null),
            'diet_failure_other' => $this->nullableString($row['diet_failure_other'] ?? null),
            'role' => $this->normalizedRole($row['role'] ?? null),
            'verified' => (bool) ($row['verified'] ?? false),
            'status' => $this->nullableString($row['status'] ?? null),
            'deleted_at' => null,
            'professional_bio' => $this->nullableString($row['professional_bio'] ?? null),
            'specialties' => $this->jsonColumn($row['specialties'] ?? null),
            'city' => $this->nullableString($row['city'] ?? null),
            'contact_display' => $this->nullableString($row['contact_display'] ?? null),
            'profile_lat' => $this->toDecimalOrNull($row['profile_lat'] ?? null),
            'profile_lng' => $this->toDecimalOrNull($row['profile_lng'] ?? null),
            'availability_text' => $this->nullableString($row['availability_text'] ?? null),
        ];
    }

    private function nullableString(mixed $value): ?string
    {
        if ($value === null) {
            return null;
        }

        $text = trim((string) $value);

        return $text !== '' ? $text : null;
    }

    private function toIntOrNull(mixed $value): ?int
    {
        return is_numeric($value) ? (int) round((float) $value) : null;
    }

    private function toDecimalOrNull(mixed $value): ?string
    {
        return is_numeric($value) ? (string) $value : null;
    }

    private function toBoolOrNull(mixed $value): ?bool
    {
        if ($value === null) {
            return null;
        }

        if ($value === true || $value === false) {
            return $value;
        }

        $normalized = strtolower(trim((string) $value));

        return match ($normalized) {
            'true', '1' => true,
            'false', '0' => false,
            default => null,
        };
    }

    private function jsonColumn(mixed $value): ?string
    {
        if ($value === null) {
            return null;
        }

        if (is_array($value)) {
            return json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        }

        $text = trim((string) $value);
        if ($text === '') {
            return null;
        }

        $decoded = json_decode($text, true);
        if (json_last_error() === JSON_ERROR_NONE) {
            return json_encode($decoded, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        }

        return json_encode([$text], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }

    private function normalizedRole(mixed $value): string
    {
        $role = strtolower(trim((string) $value));

        return in_array($role, [
            User::ROLE_ADMIN,
            User::ROLE_CLIENT,
            User::ROLE_NUTRITIONIST,
            User::ROLE_TRAINER,
        ], true) ? $role : User::ROLE_CLIENT;
    }

    private function uniqueUsername(?string $username, string $email, ?int $existingUserId = null): ?string
    {
        $base = $username !== null && $username !== ''
            ? strtolower(trim($username))
            : strtolower(Str::slug(Str::before($email, '@'), '_'));

        $base = substr($base, 0, 24);
        if ($base === '') {
            return null;
        }

        $candidate = $base;
        $suffix = 1;

        while (
            DB::table('users')
                ->where('username', $candidate)
                ->when($existingUserId !== null, fn ($query) => $query->where('id', '!=', $existingUserId))
                ->exists()
        ) {
            $tail = '_r'.$suffix;
            $candidate = substr($base, 0, max(1, 24 - strlen($tail))).$tail;
            $suffix++;
        }

        return $candidate;
    }

    private function fallbackDisplayName(?string $firstName, ?string $lastName, string $email): string
    {
        $fullName = trim(implode(' ', array_filter([$firstName, $lastName])));

        if ($fullName !== '') {
            return $fullName;
        }

        return Str::before($email, '@') ?: 'User';
    }

    private function looksLikeActualEmail(string $email): bool
    {
        $email = strtolower(trim($email));

        if ($email === '') {
            return false;
        }

        return ! str_contains($email, '@clients.hayetak.local')
            && ! str_contains($email, '@hayetak.local')
            && ! str_contains($email, '@example.');
    }
}
