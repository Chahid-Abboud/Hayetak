<?php

namespace App\Casts;

use Illuminate\Contracts\Database\Eloquent\CastsAttributes;

class PostgresTextArrayCast implements CastsAttributes
{
    public function get($model, string $key, $value, array $attributes): array
    {
        return $this->normalize($value);
    }

    public function set($model, string $key, $value, array $attributes): ?string
    {
        $items = $this->normalize($value);
        $driver = method_exists($model, 'getConnection')
            ? $model->getConnection()->getDriverName()
            : null;

        if ($items === []) {
            return $driver === 'pgsql' ? '{}' : json_encode([]);
        }

        if ($driver === 'pgsql') {
            $escaped = array_map(
                static fn (string $item): string => '"'.addcslashes($item, '\\"').'"',
                $items
            );

            return '{'.implode(',', $escaped).'}';
        }

        return json_encode($items, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }

    /**
     * @return array<int, string>
     */
    private function normalize(mixed $value): array
    {
        if (is_array($value)) {
            return $this->clean($value);
        }

        if (! is_string($value)) {
            return [];
        }

        $trimmed = trim($value);
        if ($trimmed === '') {
            return [];
        }

        if (str_starts_with($trimmed, '{') && str_ends_with($trimmed, '}')) {
            $inner = trim($trimmed, '{}');
            if ($inner === '') {
                return [];
            }

            return $this->clean(str_getcsv($inner, ',', '"', '\\') ?: []);
        }

        $decoded = json_decode($trimmed, true);
        if (is_array($decoded)) {
            return $this->clean($decoded);
        }

        return $this->clean(preg_split('/[\r\n,;]+/', $trimmed) ?: []);
    }

    /**
     * @param  array<int, mixed>  $items
     * @return array<int, string>
     */
    private function clean(array $items): array
    {
        $normalized = [];

        foreach ($items as $item) {
            $text = strtolower(trim((string) $item));
            if ($text !== '') {
                $normalized[] = $text;
            }
        }

        return array_values(array_unique($normalized));
    }
}
