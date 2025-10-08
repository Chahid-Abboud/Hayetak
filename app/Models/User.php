<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Fortify\TwoFactorAuthenticatable;

class User extends Authenticatable
{
    use HasFactory, Notifiable, TwoFactorAuthenticatable;

    /**
     * Mass assignable attributes (must match your users table).
     */
    protected $fillable = [
        // Keep legacy "name" to satisfy NOT NULL and show a full name.
        'name',

        // Basic profile
        'first_name','last_name','username','gender','age','height_cm','weight_kg',

        // Medical
        'has_medical_history','medical_history',

        // Goals / diet
        'dietary_goal','fitness_goal','diet_name','allergies',

        // Activity & Training
        'activity_level','workout_days_per_week','workout_location',

        // Diet experience
        'tried_diet_before','diet_failure_reasons','diet_failure_other',

        // Auth
        'email','password',

        // 2FA (Fortify)
        'two_factor_secret','two_factor_recovery_codes',
        // 'two_factor_confirmed_at', // if you add the column
    ];

    /**
     * Hidden for serialization.
     */
    protected $hidden = [
        'password','remember_token',
        'two_factor_secret','two_factor_recovery_codes',
    ];

    /**
     * Attribute casts (Laravel 11+ style).
     */
    protected function casts(): array
    {
        return [
            'email_verified_at'     => 'datetime',
            'password'              => 'hashed',

            'age'                   => 'integer',
            'height_cm'             => 'integer',
            'weight_kg'             => 'decimal:2',
            'has_medical_history'   => 'boolean',
            'allergies'             => 'array',
            'diet_failure_reasons'  => 'array',
            'workout_days_per_week' => 'integer',
            'tried_diet_before'     => 'boolean',
            // 'two_factor_confirmed_at' => 'datetime',
        ];
    }

    /**
     * Defaults.
     */
    protected $attributes = [
        'has_medical_history' => false,
    ];

    /* ---------------- Relationships ---------------- */

    public function prefs(): HasOne
    {
        return $this->hasOne(UserPref::class, 'user_id');
    }

    public function measurements(): HasMany
    {
        return $this->hasMany(Measurement::class, 'user_id');
    }

    /* ---------------- Mutators / Normalizers ---------------- */

    public function setFirstNameAttribute($value): void
    {
        $this->attributes['first_name'] = $value !== null ? trim($value) : null;
        $this->syncFullNameFallback();
    }

    public function setLastNameAttribute($value): void
    {
        $this->attributes['last_name'] = $value !== null ? trim($value) : null;
        $this->syncFullNameFallback();
    }

    public function setUsernameAttribute($value): void
    {
        $this->attributes['username'] = $value !== null ? strtolower(trim($value)) : null;
    }

    public function setEmailAttribute($value): void
    {
        $this->attributes['email'] = $value !== null ? strtolower(trim($value)) : null;
        $this->syncFullNameFallback();
    }

    public function setDietNameAttribute($value): void
    {
        $this->attributes['diet_name'] = $value !== null ? trim($value) : null;
    }

    public function setDietFailureOtherAttribute($value): void
    {
        $this->attributes['diet_failure_other'] = $value !== null ? trim($value) : null;
    }

    /**
     * Keep `name` populated even if only first/last OR email is present.
     */
    protected function syncFullNameFallback(): void
    {
        // If name already set explicitly, don't override it.
        if (!empty($this->attributes['name'])) {
            return;
        }

        $first = trim((string) ($this->attributes['first_name'] ?? ''));
        $last  = trim((string) ($this->attributes['last_name'] ?? ''));
        $full  = trim($first.' '.$last);

        if ($full !== '') {
            $this->attributes['name'] = $full;
        } elseif (!empty($this->attributes['email'])) {
            $this->attributes['name'] = strtok($this->attributes['email'], '@') ?: 'User';
        }
    }

    /* ---------------- Accessors / Helpers ---------------- */

    public function getDisplayNameAttribute(): string
    {
        $first = trim((string) ($this->first_name ?? ''));
        $last  = trim((string) ($this->last_name ?? ''));
        $full  = trim($first . ' ' . $last);

        return $full !== '' ? $full : ($this->username ?? $this->name ?? $this->email ?? 'User');
    }

    /**
     * Allow login via username OR email.
     */
    public function scopeWhereLogin($query, string $login)
    {
        $login = strtolower(trim($login));
        return $query->where(function ($q) use ($login) {
            $q->where('username', $login)->orWhere('email', $login);
        });
    }
}
