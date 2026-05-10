<?php

namespace App\Services\Messaging;

use App\Models\AiPlan;
use App\Models\Appointment;
use App\Models\Conversation;
use App\Models\MealEntry;
use App\Models\ProfessionalClientAssignment;
use App\Models\User;
use App\Models\WorkoutLog;
use Illuminate\Support\Carbon;

class ConversationContextBuilder
{
    public function build(Conversation $conversation, User $actor): array
    {
        $participants = $conversation->participants()->get();
        /** @var User|null $peer */
        $peer = $participants->firstWhere('id', '!=', $actor->id);

        if (! $peer) {
            return [
                'conversation_id' => $conversation->id,
                'context_mode' => 'client_summary',
                'peer' => null,
                'relationship' => null,
                'safety' => [
                    'badges' => [],
                ],
                'client_snapshot' => null,
                'professional_snapshot' => null,
                'activity' => [
                    'today' => [],
                    'last_7_days' => [],
                ],
                'plan' => null,
                'appointments' => [
                    'next' => null,
                    'upcoming_count' => 0,
                ],
            ];
        }

        $today = Carbon::today();
        $sevenDaysAgo = Carbon::today()->subDays(6);
        $peerIsProfessional = in_array($peer->role, [User::ROLE_NUTRITIONIST, User::ROLE_TRAINER], true);

        $todayMeals = collect();
        $last7Meals = collect();
        $todayWorkouts = collect();
        $last7Workouts = collect();
        $latestPlan = null;

        if (! $peerIsProfessional) {
            $todayMeals = MealEntry::query()
                ->with('food:id,calories')
                ->where('user_id', $peer->id)
                ->whereDate('eaten_at', $today->toDateString())
                ->get();

            $last7Meals = MealEntry::query()
                ->with('food:id,calories')
                ->where('user_id', $peer->id)
                ->whereDate('eaten_at', '>=', $sevenDaysAgo->toDateString())
                ->get();

            $todayWorkouts = WorkoutLog::query()
                ->withCount('sets')
                ->where('user_id', $peer->id)
                ->whereDate('performed_at', $today->toDateString())
                ->get();

            $last7Workouts = WorkoutLog::query()
                ->withCount('sets')
                ->where('user_id', $peer->id)
                ->whereDate('performed_at', '>=', $sevenDaysAgo->toDateString())
                ->get();

            $latestPlan = AiPlan::query()
                ->where('user_id', $peer->id)
                ->latest('id')
                ->first();
        }

        $nextAppointment = Appointment::query()
            ->where(function ($query) use ($actor, $peer) {
                $query
                    ->where(function ($nested) use ($actor, $peer) {
                        $nested->where('client_id', $actor->id)
                            ->where('professional_id', $peer->id);
                    })
                    ->orWhere(function ($nested) use ($actor, $peer) {
                        $nested->where('client_id', $peer->id)
                            ->where('professional_id', $actor->id);
                    });
            })
            ->whereIn('status', ['requested', 'accepted'])
            ->where('scheduled_at', '>=', now())
            ->orderBy('scheduled_at')
            ->first();

        $upcomingAppointmentsCount = Appointment::query()
            ->where(function ($query) use ($actor, $peer) {
                $query
                    ->where(function ($nested) use ($actor, $peer) {
                        $nested->where('client_id', $actor->id)
                            ->where('professional_id', $peer->id);
                    })
                    ->orWhere(function ($nested) use ($actor, $peer) {
                        $nested->where('client_id', $peer->id)
                            ->where('professional_id', $actor->id);
                    });
            })
            ->whereIn('status', ['requested', 'accepted'])
            ->where('scheduled_at', '>=', now())
            ->count();

        $assignment = ProfessionalClientAssignment::query()
            ->where(function ($query) use ($actor, $peer) {
                $query
                    ->where(function ($nested) use ($actor, $peer) {
                        $nested->where('professional_id', $actor->id)
                            ->where('client_id', $peer->id);
                    })
                    ->orWhere(function ($nested) use ($actor, $peer) {
                        $nested->where('professional_id', $peer->id)
                            ->where('client_id', $actor->id);
                    });
            })
            ->latest('id')
            ->first();

        $allergies = array_values(array_filter($peer->allergies ?? []));
        $badges = [];
        if (count($allergies) > 0) {
            $badges[] = 'allergies';
        }
        if ((bool) $peer->has_medical_history) {
            $badges[] = 'medical_history';
        }
        if (! empty($peer->workout_location)) {
            $badges[] = 'workout_location';
        }

        return [
            'conversation_id' => $conversation->id,
            'context_mode' => $peerIsProfessional ? 'professional_summary' : 'client_summary',
            'peer' => [
                'id' => $peer->id,
                'name' => $peer->display_name,
                'role' => $peer->role,
                'city' => $peer->city,
                'verified' => (bool) $peer->verified,
                'status' => $peer->status,
            ],
            'relationship' => [
                'assigned' => (bool) $assignment,
                'assignment_role' => $assignment?->professional_role,
                'has_upcoming_appointment' => $nextAppointment !== null,
            ],
            'safety' => [
                'allergies' => $allergies,
                'has_medical_history' => (bool) $peer->has_medical_history,
                'diet_name' => $peer->diet_name,
                'dietary_goal' => $peer->dietary_goal,
                'fitness_goal' => $peer->fitness_goal,
                'workout_location' => $peer->workout_location,
                'badges' => $badges,
            ],
            'client_snapshot' => $peerIsProfessional ? null : [
                'goals' => array_values(array_filter([
                    $peer->dietary_goal,
                    $peer->fitness_goal,
                ])),
                'diet_name' => $peer->diet_name,
                'allergies' => $allergies,
                'has_medical_history' => (bool) $peer->has_medical_history,
                'workout_location' => $peer->workout_location,
            ],
            'professional_snapshot' => $peerIsProfessional ? [
                'role_label' => $this->roleLabel($peer->role),
                'specialties' => array_values(array_filter($peer->specialties ?? [])),
                'availability_text' => $peer->availability_text,
                'city' => $peer->city,
                'verified' => (bool) $peer->verified,
            ] : null,
            'activity' => [
                'today' => [
                    'meals_logged' => $todayMeals->count(),
                    'meal_calories' => $this->calculateMealCalories($todayMeals),
                    'workouts_logged' => $todayWorkouts->count(),
                    'workout_minutes' => (int) $todayWorkouts->sum('duration_min'),
                    'workout_sets' => (int) $todayWorkouts->sum('sets_count'),
                ],
                'last_7_days' => [
                    'meals_logged' => $last7Meals->count(),
                    'meal_calories' => $this->calculateMealCalories($last7Meals),
                    'workouts_logged' => $last7Workouts->count(),
                    'workout_minutes' => (int) $last7Workouts->sum('duration_min'),
                    'workout_sets' => (int) $last7Workouts->sum('sets_count'),
                ],
            ],
            'plan' => $latestPlan ? [
                'id' => $latestPlan->id,
                'type' => $latestPlan->type,
                'version' => $latestPlan->version,
                'created_at' => $latestPlan->created_at,
            ] : null,
            'appointments' => [
                'next' => $nextAppointment ? [
                    'id' => $nextAppointment->id,
                    'status' => $nextAppointment->status,
                    'scheduled_at' => $nextAppointment->scheduled_at,
                    'professional_role' => $nextAppointment->professional_role,
                ] : null,
                'upcoming_count' => $upcomingAppointmentsCount,
            ],
        ];
    }

    private function calculateMealCalories(iterable $meals): int
    {
        $total = 0;

        foreach ($meals as $meal) {
            $servings = $meal->servings !== null ? (float) $meal->servings : 1.0;
            $foodCalories = $meal->food?->calories !== null ? (float) $meal->food->calories : 0.0;
            $total += (int) round($servings * $foodCalories);
        }

        return $total;
    }

    private function roleLabel(?string $role): string
    {
        return match ($role) {
            User::ROLE_NUTRITIONIST => 'Dietitian',
            User::ROLE_TRAINER => 'Personal Trainer',
            default => ucfirst((string) ($role ?? 'Professional')),
        };
    }
}
