<?php

namespace App\Services\Ai\Training;

use App\Models\User;
use Illuminate\Support\Str;

class ImportedPlannerIdentityService
{
    private const FEMALE_FIRST_NAMES = [
        'Nadine',
        'Maya',
        'Lina',
        'Rana',
        'Sara',
        'Yara',
        'Mira',
        'Tala',
        'Hiba',
        'Noor',
        'Dania',
        'Leen',
        'Rima',
        'Lynn',
        'Jana',
        'Aya',
    ];

    private const MALE_FIRST_NAMES = [
        'Karim',
        'Rami',
        'Jad',
        'Hadi',
        'Fadi',
        'Ziad',
        'Omar',
        'Tariq',
        'Charbel',
        'Nabil',
        'Samer',
        'Fares',
        'George',
        'Hassan',
        'Ralph',
        'Elie',
    ];

    private const LAST_NAMES = [
        'Haddad',
        'Khoury',
        'Saliba',
        'Fares',
        'Nasser',
        'Saad',
        'Tannous',
        'Younes',
        'Khalil',
        'Rahme',
        'Mansour',
        'Chehab',
        'Issa',
        'Maalouf',
        'Amin',
        'Sayegh',
    ];

    /**
     * @return array{first_name:string,last_name:string,name:string}
     */
    public function identityForProfile(string $profileId, ?string $gender = null): array
    {
        $seed = abs(crc32(strtolower(trim($profileId))));
        $firstNames = strtolower((string) $gender) === 'female'
            ? self::FEMALE_FIRST_NAMES
            : self::MALE_FIRST_NAMES;

        $firstName = $firstNames[$seed % count($firstNames)];
        $lastName = self::LAST_NAMES[(int) floor($seed / 7) % count(self::LAST_NAMES)];

        return [
            'first_name' => $firstName,
            'last_name' => $lastName,
            'name' => trim($firstName.' '.$lastName),
        ];
    }

    public function usernameForProfile(string $profileId, ?string $gender = null): string
    {
        $identity = $this->identityForProfile($profileId, $gender);
        $base = Str::lower($identity['first_name'].$identity['last_name']);
        $suffix = Str::lower(preg_replace('/[^a-z0-9]+/i', '', $profileId) ?? '');
        $maxBaseLength = max(1, 24 - (strlen($suffix) + 1));
        $base = substr($base, 0, $maxBaseLength);

        return trim($base.'_'.$suffix, '_');
    }

    public function emailForProfile(string $profileId, ?string $gender = null, string $domain = 'clients.hayetak.local'): string
    {
        $identity = $this->identityForProfile($profileId, $gender);
        $localBase = Str::slug($identity['first_name'].'.'.$identity['last_name'], '.');
        $profileToken = Str::lower(preg_replace('/[^a-z0-9]+/i', '', $profileId) ?? $profileId);

        return trim($localBase.'.'.$profileToken, '.').'@'.Str::lower(trim($domain));
    }

    public function profileIdFromEmail(string $email): ?string
    {
        $email = strtolower(trim($email));
        if (! preg_match('/^planner\+([^@]+)@hayetak\.local$/', $email, $matches)) {
            return null;
        }

        return strtoupper(trim((string) ($matches[1] ?? '')));
    }

    public function shouldReplacePlaceholder(User $user): bool
    {
        $firstName = trim((string) ($user->first_name ?? ''));
        $lastName = trim((string) ($user->last_name ?? ''));
        $name = trim((string) ($user->name ?? ''));

        if ($this->profileIdFromEmail((string) $user->email) === null) {
            return false;
        }

        return strtolower($firstName) === 'planner'
            || preg_match('/^P\d+$/i', $lastName) === 1
            || preg_match('/^Planner\s+P\d+$/i', $name) === 1;
    }
}
