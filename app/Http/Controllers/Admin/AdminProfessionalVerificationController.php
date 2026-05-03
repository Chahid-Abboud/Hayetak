<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\AdminReviewProfessionalVerificationRequest;
use App\Models\ProfessionalVerification;
use App\Services\AdminActionLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminProfessionalVerificationController extends Controller
{
    public function __construct(private readonly AdminActionLogger $logger) {}

    public function index(Request $request): JsonResponse
    {
        $status = (string) $request->query('status', 'pending');
        $role = (string) $request->query('role', 'all');
        $search = trim((string) $request->query('search', ''));

        abort_unless(in_array($status, ['all', 'pending', 'approved', 'rejected', 'needs_info'], true), 422, 'Invalid status');
        abort_unless(in_array($role, ['all', 'trainer', 'nutritionist'], true), 422, 'Invalid role');

        $rows = ProfessionalVerification::query()
            ->with(['user:id,email,first_name,last_name,role,verified,status', 'reviewer:id,first_name,last_name,email'])
            ->when($status !== 'all', fn ($q) => $q->where('review_status', $status))
            ->when($role !== 'all', fn ($q) => $q->where('role', $role))
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($inner) use ($search) {
                    $inner
                        ->where('full_legal_name', 'like', "%{$search}%")
                        ->orWhere('license_number', 'like', "%{$search}%")
                        ->orWhere('authority', 'like', "%{$search}%")
                        ->orWhere('country_state', 'like', "%{$search}%")
                        ->orWhereHas('user', function ($userQuery) use ($search) {
                            $userQuery
                                ->where('email', 'like', "%{$search}%")
                                ->orWhere('first_name', 'like', "%{$search}%")
                                ->orWhere('last_name', 'like', "%{$search}%");
                        });
                });
            })
            ->latest('id')
            ->paginate((int) $request->query('per_page', 20));

        return response()->json($rows);
    }

    public function review(AdminReviewProfessionalVerificationRequest $request, ProfessionalVerification $professionalVerification): JsonResponse
    {
        $data = $request->validated();
        $admin = $request->user();

        $professionalVerification->update([
            'review_status' => $data['review_status'],
            'notes' => $data['notes'] ?? null,
            'reviewed_by' => $admin->id,
            'reviewed_at' => now(),
        ]);

        $user = $professionalVerification->user;
        if ($data['review_status'] === 'approved') {
            $user->update([
                'verified' => true,
                'status' => 'active',
            ]);
        } elseif ($data['review_status'] === 'rejected') {
            $user->update([
                'verified' => false,
                'status' => 'rejected',
            ]);
        } else {
            $user->update([
                'verified' => false,
                'status' => 'needs_info',
            ]);
        }

        $this->logger->log($admin->id, 'admin.professional_verification.review', $professionalVerification, [
            'user_id' => $user->id,
            'review_status' => $data['review_status'],
        ]);

        return response()->json([
            'ok' => true,
            'verification' => $professionalVerification->fresh(['user', 'reviewer']),
        ]);
    }
}
