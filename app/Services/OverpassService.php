<?php

namespace App\Services;

use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Throwable;

class OverpassService
{
    /** @var string[] */
    private array $endpoints;

    public function __construct()
    {
        $this->endpoints = array_values(array_filter([
            config('services.overpass.endpoint'),
            'https://overpass.openstreetmap.fr/api/interpreter',
            'https://overpass-api.de/api/interpreter',
            'https://overpass.kumi.systems/api/interpreter', // keep last (often flaky DNS)
        ]));
    }

    /**
     * Back-compat wrapper used by PlacesController.
     * Returns Overpass "elements" array for a circle around (lat,lng).
     *
     * @param  array  $types  e.g. ['gym','nutritionist']
     * @return array elements[]
     */
    public function searchAround(float $lat, float $lng, int $radiusMeters = 1500, array $types = []): array
    {
        // Build a small bbox around the center point
        $bbox = $this->bboxFromCenter($lat, $lng, $radiusMeters);

        // Map logical types to simple tag filters.
        $typeMap = [
            'gym' => ['amenity' => 'gym'],
            'nutritionist' => ['healthcare' => 'nutritionist'],
        ];

        if (empty($types)) {
            $types = ['gym', 'nutritionist'];
        }

        $merged = [];
        $seen = [];

        foreach ($types as $t) {
            $t = strtolower(trim((string) $t));
            $filters = $typeMap[$t] ?? ['amenity' => 'gym']; // safe default

            $data = $this->fetchPlaces($bbox, $filters);     // full Overpass JSON
            $elements = $data['elements'] ?? [];

            foreach ($elements as $el) {
                $key = ($el['type'] ?? '').'#'.($el['id'] ?? '');
                if (! isset($seen[$key])) {
                    $seen[$key] = true;
                    $merged[] = $el;
                }
            }
        }

        return $merged; // controller expects an elements array
    }

    /**
     * Compute a bbox around a center in meters.
     *
     * @return array{0:float,1:float,2:float,3:float} [south, west, north, east]
     */
    private function bboxFromCenter(float $lat, float $lng, int $radiusMeters): array
    {
        // ~111,320 m per degree latitude
        $latDelta = $radiusMeters / 111_320;

        // longitude degrees shrink by cos(latitude)
        $cosLat = max(cos(deg2rad($lat)), 0.00001);
        $lngDelta = $radiusMeters / (111_320 * $cosLat);

        return [
            $lat - $latDelta,  // south
            $lng - $lngDelta,  // west
            $lat + $latDelta,  // north
            $lng + $lngDelta,  // east
        ];
    }

    /**
     * @param  array{0:float,1:float,2:float,3:float}  $bbox  [south, west, north, east]
     * @param  array<string, string|string[]>  $filters
     */
    public function fetchPlaces(array $bbox, array $filters = []): array
    {
        [$s,$w,$n,$e] = $bbox;
        if (! is_numeric($s) || ! is_numeric($w) || ! is_numeric($n) || ! is_numeric($e) || $n <= $s || $e <= $w) {
            throw new \InvalidArgumentException('Invalid bounding box.');
        }
        if (($n - $s) > 0.25 || ($e - $w) > 0.25) {
            throw new \InvalidArgumentException('Bounding box too large—zoom in further.');
        }

        $bboxString = implode(',', [$s, $w, $n, $e]);
        $filterQl = $this->buildFilterQl($filters);

        $query = <<<QL
[out:json][timeout:25];
(
  node[$filterQl]($bboxString);
  way[$filterQl]($bboxString);
  relation[$filterQl]($bboxString);
);
out center 50;
QL;

        $cacheKey = 'overpass:'.md5($query);
        if (Cache::has($cacheKey)) {
            return Cache::get($cacheKey);
        }

        $timeout = (int) config('services.overpass.timeout', 20);
        $retries = (int) config('services.overpass.retries', 4);            // a bit higher
        $delayMs = (int) config('services.overpass.retry_delay_ms', 1800);
        $ttl = (int) config('services.overpass.cache_ttl', 21600);

        try {
            $data = $this->callOverpass($query, $timeout, $retries, $delayMs);
            Cache::put($cacheKey, $data, $ttl);

            return $data;
        } catch (Throwable $e) {
            logger()->error('Overpass exception (all mirrors failed)', ['msg' => $e->getMessage()]);
            if (Cache::has($cacheKey)) {
                return Cache::get($cacheKey);
            }
            throw $e;
        }
    }

    private function callOverpass(string $query, int $timeout, int $retries, int $delayMs): array
    {
        $lastEx = null;

        foreach ($this->endpoints as $endpoint) {
            $insecureTried = false;

            // jitter to avoid thundering herd when you pan/zoom
            usleep(random_int(100_000, 300_000));

            try {
                $resp = $this->http($timeout, false)
                    ->retry($retries, $delayMs, function ($exception, $request, $response = null) {
                        if ($exception) {
                            return true;
                        }
                        if (! $response) {
                            return true;
                        }
                        $s = $response->status();

                        return $s === 429 || ($s >= 500 && $s < 600);
                    })
                    ->asForm()
                    ->post($endpoint, ['data' => $query]);

                if ($resp->successful()) {
                    return $resp->json();
                }

                logger()->warning('Overpass mirror failed', [
                    'endpoint' => $endpoint,
                    'status' => $resp->status(),
                    'body' => mb_substr($resp->body(), 0, 1000),
                ]);
            } catch (Throwable $e) {
                $lastEx = $e;
                $msg = $e->getMessage();

                // If it’s an SSL trust error, try ONCE with verify=false (local dev only)
                if (! $insecureTried && (str_contains($msg, 'cURL error 60') || str_contains($msg, 'cURL error 77') || str_contains($msg, 'SSL'))) {
                    $insecureTried = true;
                    logger()->warning('Overpass SSL verify failed; retrying insecurely (local dev only).', [
                        'endpoint' => $endpoint, 'error' => $msg,
                    ]);

                    try {
                        $resp = $this->http($timeout, true)
                            ->retry(min(1, $retries), $delayMs) // one quick insecure retry
                            ->asForm()
                            ->post($endpoint, ['data' => $query]);

                        if ($resp->successful()) {
                            return $resp->json();
                        }

                        logger()->warning('Overpass insecure retry failed', [
                            'endpoint' => $endpoint,
                            'status' => $resp->status(),
                            'body' => mb_substr($resp->body(), 0, 800),
                        ]);
                    } catch (Throwable $e2) {
                        logger()->warning('Overpass insecure retry exception', [
                            'endpoint' => $endpoint, 'msg' => $e2->getMessage(),
                        ]);
                    }
                } else {
                    logger()->warning('Overpass mirror exception', [
                        'endpoint' => $endpoint, 'msg' => $msg,
                    ]);
                }
            }
        }

        throw $lastEx ?? new \RuntimeException('All Overpass mirrors failed');
    }

    private function http(int $timeout, bool $insecure): PendingRequest
    {
        $ua = config('services.overpass.user_agent', 'Hayetak/1.0 (+contact)');
        $http = Http::withHeaders(['User-Agent' => $ua])->timeout($timeout);

        if ($insecure || (bool) config('services.overpass.skip_verify', false)) {
            return $http->withOptions(['verify' => false]); // LOCAL DEV ONLY
        }

        // Use explicit CA path if provided (works even if php.ini isn’t saving)
        $verifyPath = (string) (config('services.overpass.ca_path') ?: env('CURL_CA_BUNDLE', ''));
        if ($verifyPath !== '' && @is_file($verifyPath)) {
            $http = $http->withOptions(['verify' => $verifyPath]);
        }

        return $http;
    }

    private function buildFilterQl(array $filters): string
    {
        $parts = [];
        foreach ($filters as $k => $v) {
            if (is_array($v) && $v) {
                $alts = implode('|', array_map(fn ($x) => preg_quote((string) $x, '/'), $v));
                $parts[] = "\"{$k}\"~\"^({$alts})$\"";
            } elseif ($v !== null && $v !== '') {
                $parts[] = "\"{$k}\"=\"{$v}\"";
            } else {
                $parts[] = $k;
            }
        }

        return $parts ? implode('][', $parts) : 'amenity';
    }
}
