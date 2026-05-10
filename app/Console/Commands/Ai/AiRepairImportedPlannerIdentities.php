<?php

namespace App\Console\Commands\Ai;

use App\Models\User;
use App\Services\Ai\Training\ImportedPlannerIdentityService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class AiRepairImportedPlannerIdentities extends Command
{
    protected $signature = 'ai:repair-imported-planner-identities
        {--email-like=planner+%@hayetak.local : SQL LIKE filter for imported planner placeholder emails}
        {--email-domain=clients.hayetak.local : Domain to use for repaired internal emails}
        {--dry-run=1 : Preview only (1=yes, 0=apply updates)}
    ';

    protected $description = 'Replace imported planner placeholder names, usernames, and emails with stable human-readable internal identities.';

    public function handle(ImportedPlannerIdentityService $identities): int
    {
        $dryRun = ((int) $this->option('dry-run')) === 1;
        $emailLike = trim((string) $this->option('email-like'));
        $emailDomain = trim((string) $this->option('email-domain')) ?: 'clients.hayetak.local';

        $userQuery = User::query()
            ->where('role', '!=', User::ROLE_ADMIN)
            ->where('email', 'like', $emailLike)
            ->orderBy('id');

        if (Schema::hasColumn('users', 'data_origin')) {
            $userQuery->where('data_origin', User::DATA_ORIGIN_IMPORTED_REAL);
        }

        $users = $userQuery->get()->filter(function (User $user): bool {
            if (Schema::hasColumn('users', 'data_origin')) {
                return (string) $user->data_origin === User::DATA_ORIGIN_IMPORTED_REAL;
            }

            return $this->hasImportedPlannerEvidence($user);
        })->values();

        if ($users->isEmpty()) {
            $this->warn('No imported planner placeholder users matched the provided filter.');

            return self::SUCCESS;
        }

        $rows = [];
        $updated = 0;
        $skipped = 0;

        foreach ($users as $user) {
            $profileId = $this->resolveProfileId($user, $identities);
            if ($profileId === null) {
                $rows[] = [$user->id, (string) $user->email, 'skip', 'Missing profile id'];
                $skipped++;

                continue;
            }

            $identity = $identities->identityForProfile($profileId, (string) $user->gender);
            $targetUsername = $identities->usernameForProfile($profileId, (string) $user->gender);
            $targetEmail = $identities->emailForProfile($profileId, (string) $user->gender, $emailDomain);

            if (
                (string) $user->first_name === $identity['first_name']
                && (string) $user->last_name === $identity['last_name']
                && (string) $user->name === $identity['name']
                && (string) ($user->username ?? '') === $targetUsername
                && (string) $user->email === $targetEmail
            ) {
                $rows[] = [$user->id, (string) $user->email, 'skip', 'Already repaired'];
                $skipped++;

                continue;
            }

            if (! $dryRun) {
                DB::transaction(function () use ($user, $identity, $targetUsername, $targetEmail): void {
                    $user->forceFill([
                        'first_name' => $identity['first_name'],
                        'last_name' => $identity['last_name'],
                        'name' => $identity['name'],
                        'username' => $targetUsername,
                        'email' => $targetEmail,
                    ])->save();
                });
            }

            $rows[] = [$user->id, (string) $user->email, $dryRun ? 'preview' : 'updated', $targetEmail];
            $updated++;
        }

        $this->table(['User ID', 'Current email', 'Status', 'Target / reason'], $rows);
        $this->info(sprintf(
            '%s %d imported planner identities. Skipped %d.',
            $dryRun ? 'Previewed' : 'Updated',
            $updated,
            $skipped
        ));

        return self::SUCCESS;
    }

    private function resolveProfileId(User $user, ImportedPlannerIdentityService $identities): ?string
    {
        $fromEmail = $identities->profileIdFromEmail((string) $user->email);
        if ($fromEmail !== null) {
            return $fromEmail;
        }

        $settings = DB::table('user_prefs')
            ->where('user_id', $user->id)
            ->value('settings');

        if (is_array($settings)) {
            $decoded = $settings;
        } elseif (is_string($settings) && $settings !== '') {
            $decoded = json_decode($settings, true);
        } else {
            $decoded = null;
        }

        $profileId = is_array($decoded) ? trim((string) ($decoded['profile_id'] ?? '')) : '';

        return $profileId !== '' ? strtoupper($profileId) : null;
    }

    private function hasImportedPlannerEvidence(User $user): bool
    {
        $settings = DB::table('user_prefs')
            ->where('user_id', $user->id)
            ->value('settings');

        if (is_array($settings)) {
            $decoded = $settings;
        } elseif (is_string($settings) && $settings !== '') {
            $decoded = json_decode($settings, true);
        } else {
            $decoded = null;
        }

        if (is_array($decoded) && trim((string) ($decoded['import_source'] ?? '')) !== '') {
            return true;
        }

        return DB::table('measurements')
            ->where('user_id', $user->id)
            ->where('notes', 'like', '%Imported planner%')
            ->exists();
    }
}
