<?php

namespace App\Http\Controllers;

use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DietitianDiscoveryController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $area = trim((string) $request->query('area', ''));

        $query = User::query()
            ->where('role', User::ROLE_NUTRITIONIST)
            ->where('verified', true)
            ->whereNull('deleted_at')
            ->orderBy('first_name');

        if ($area !== '') {
            $needle = mb_strtolower($area);
            $query->where(function ($q) use ($needle) {
                $q->whereRaw('LOWER(COALESCE(status, \'\')) LIKE ?', ["%{$needle}%"])
                    ->orWhereRaw('LOWER(COALESCE(medical_history, \'\')) LIKE ?', ["%{$needle}%"]);
            });
        }

        return response()->json(UserResource::collection($query->paginate((int) $request->query('per_page', 20))));
    }
}
