<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\ProfessionalVerification;
use App\Models\User;
use App\Services\AdminActionLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AdminProfessionalController extends Controller
{
    public function __construct(private readonly AdminActionLogger $logger) {}

    public function index(Request $request): JsonResponse
    {
        $role = (string) $request->query('role', User::ROLE_TRAINER);

        abort_unless(in_array($role, [User::ROLE_TRAINER, User::ROLE_NUTRITIONIST], true), 422, 'Invalid role');

        $rows = User::query()
            ->with(['latestProfessionalVerification'])
            ->where('role', $role)
            ->orderBy('id')
            ->paginate((int) $request->query('per_page', 20));

        return response()->json($rows);
    }

    public function show(User $user): JsonResponse
    {
        abort_unless($user->hasRole(User::ROLE_TRAINER, User::ROLE_NUTRITIONIST), 422);

        return response()->json([
            'user' => new UserResource($user->load('latestProfessionalVerification')),
            'verification' => $user->latestProfessionalVerification,
            'measurements' => $user->measurements()->latest('measured_at')->limit(20)->get(),
        ]);
    }

    public function update(Request $request, User $user): JsonResponse
    {
        abort_unless($user->hasRole(User::ROLE_TRAINER, User::ROLE_NUTRITIONIST), 422);

        $data = $request->validate([
            'first_name' => ['sometimes', 'nullable', 'string', 'max:40'],
            'last_name' => ['sometimes', 'nullable', 'string', 'max:40'],
            'city' => ['sometimes', 'nullable', 'string', 'max:120'],
            'contact_display' => ['sometimes', 'nullable', 'string', 'max:160'],
            'professional_bio' => ['sometimes', 'nullable', 'string', 'max:5000'],
            'specialties' => ['sometimes', 'nullable', 'array'],
            'specialties.*' => ['string', 'max:120'],
            'availability_text' => ['sometimes', 'nullable', 'string', 'max:191'],
            'profile_lat' => ['sometimes', 'nullable', 'numeric', 'between:-90,90'],
            'profile_lng' => ['sometimes', 'nullable', 'numeric', 'between:-180,180'],
            'verified' => ['sometimes', 'boolean'],
            'status' => ['sometimes', 'nullable', 'string', 'max:30'],
            'verification_review_status' => ['sometimes', Rule::in(['pending', 'approved', 'rejected', 'needs_info'])],
            'verification_notes' => ['sometimes', 'nullable', 'string', 'max:2000'],
        ]);

        $before = $user->only(['verified', 'status', 'city', 'contact_display', 'professional_bio', 'specialties', 'availability_text', 'profile_lat', 'profile_lng']);

        $user->fill($data);
        $user->save();

        if (isset($data['verification_review_status'])) {
            $verification = ProfessionalVerification::query()
                ->where('user_id', $user->id)
                ->latest('id')
                ->first();

            if ($verification) {
                $verification->update([
                    'review_status' => $data['verification_review_status'],
                    'notes' => $data['verification_notes'] ?? $verification->notes,
                    'reviewed_by' => $request->user()->id,
                    'reviewed_at' => now(),
                ]);
            }
        }

        $this->logger->log($request->user()->id, 'admin.professional.update', $user, [
            'before' => $before,
            'after' => $user->only(['verified', 'status', 'city', 'contact_display', 'professional_bio', 'specialties', 'availability_text', 'profile_lat', 'profile_lng']),
        ]);

        return response()->json([
            'ok' => true,
            'user' => new UserResource($user->fresh('latestProfessionalVerification')),
        ]);
    }
}

