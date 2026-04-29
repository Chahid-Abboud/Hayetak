<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\ProfessionalAccessService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;

class DietitianDiscoveryController extends Controller
{
    public function __construct(
        private readonly ProfessionalAccessService $access,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $area = trim((string) $request->query('area', ''));
        $role = trim((string) $request->query('role', ''));
        $viewer = $request->user();
        $viewerLat = is_numeric($request->query('lat')) ? (float) $request->query('lat') : null;
        $viewerLng = is_numeric($request->query('lng')) ? (float) $request->query('lng') : null;
        $roles = [User::ROLE_NUTRITIONIST, User::ROLE_TRAINER];

        $query = User::query()
            ->select([
                'users.id', 'users.first_name', 'users.last_name', 'users.name', 'users.email',
                'users.role', 'users.verified', 'users.status', 'users.city', 'users.contact_display',
                'users.specialties', 'users.professional_bio', 'users.profile_lat', 'users.profile_lng',
            ])
            ->join('professional_verifications as pv', function ($join) {
                $join->on('pv.user_id', '=', 'users.id')
                    ->whereColumn('pv.role', 'users.role')
                    ->where('pv.review_status', '=', 'approved');
            })
            ->whereIn('users.role', $roles)
            ->where('users.verified', true)
            ->whereNull('users.deleted_at')
            ->addSelect(['pv.country_state as area', 'pv.authority'])
            ->orderByRaw("case users.role when 'nutritionist' then 0 when 'trainer' then 1 else 2 end")
            ->orderBy('users.first_name');

        if (in_array($role, $roles, true)) {
            $query->where('users.role', $role);
        }

        if ($area !== '') {
            $needle = mb_strtolower($area);
            $query->whereRaw('LOWER(COALESCE(pv.country_state, \'\')) LIKE ?', ["%{$needle}%"]);
        }

        $rows = $query->get()->map(fn ($u) => [
            'id' => $u->id,
            'name' => trim(($u->first_name ?? '').' '.($u->last_name ?? '')) ?: $u->name,
            'email' => $u->email,
            'role' => $u->role,
            'verified' => (bool) $u->verified,
            'status' => $u->status,
            'bio' => $u->professional_bio,
            'specialties' => $u->specialties ?? [],
            'city' => $u->city,
            'contact_display' => $u->contact_display,
            'lat' => $u->profile_lat,
            'lng' => $u->profile_lng,
            'area' => $u->area,
            'authority' => $u->authority,
            'distance_m' => $this->distanceForViewer($viewerLat, $viewerLng, $u->profile_lat, $u->profile_lng),
            'canInteract' => $viewer ? $this->access->canInteract($viewer, $u) : false,
        ]);

        if ($viewerLat !== null && $viewerLng !== null) {
            $rows = $rows
                ->sort(function (array $a, array $b): int {
                    $aDistance = $a['distance_m'];
                    $bDistance = $b['distance_m'];

                    if ($aDistance === null && $bDistance === null) {
                        return strcasecmp((string) $a['name'], (string) $b['name']);
                    }

                    if ($aDistance === null) {
                        return 1;
                    }

                    if ($bDistance === null) {
                        return -1;
                    }

                    if ($aDistance !== $bDistance) {
                        return $aDistance <=> $bDistance;
                    }

                    return strcasecmp((string) $a['name'], (string) $b['name']);
                })
                ->values();
        }

        $perPage = max(1, (int) $request->query('per_page', 20));
        $page = max(1, (int) $request->query('page', 1));
        $paginated = new LengthAwarePaginator(
            $rows->forPage($page, $perPage)->values(),
            $rows->count(),
            $perPage,
            $page,
            [
                'path' => $request->url(),
                'query' => $request->query(),
            ],
        );

        return response()->json($paginated);
    }

    private function distanceForViewer(
        ?float $viewerLat,
        ?float $viewerLng,
        mixed $professionalLat,
        mixed $professionalLng,
    ): ?float {
        if (
            $viewerLat === null ||
            $viewerLng === null ||
            ! is_numeric($professionalLat) ||
            ! is_numeric($professionalLng)
        ) {
            return null;
        }

        return round(
            $this->distanceMeters(
                $viewerLat,
                $viewerLng,
                (float) $professionalLat,
                (float) $professionalLng,
            ),
            1,
        );
    }

    private function distanceMeters(float $lat1, float $lon1, float $lat2, float $lon2): float
    {
        $earth = 6371000;
        $dLat = deg2rad($lat2 - $lat1);
        $dLon = deg2rad($lon2 - $lon1);
        $a = sin($dLat / 2) * sin($dLat / 2) +
            cos(deg2rad($lat1)) * cos(deg2rad($lat2)) *
            sin($dLon / 2) * sin($dLon / 2);
        $c = 2 * atan2(sqrt($a), sqrt(1 - $a));

        return $earth * $c;
    }
}
