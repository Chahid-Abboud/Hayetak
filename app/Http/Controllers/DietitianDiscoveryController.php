<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\ProfessionalAccessService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

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

        $rows = $query->paginate((int) $request->query('per_page', 20))
            ->through(fn ($u) => [
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
                'canInteract' => $viewer ? $this->access->canInteract($viewer, $u) : false,
            ]);

        return response()->json($rows);
    }
}
