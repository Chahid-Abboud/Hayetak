<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Exercise;
use App\Services\AdminActionLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class AdminExerciseController extends Controller
{
    public function __construct(
        private readonly AdminActionLogger $logger,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $search = trim((string) $request->query('q', ''));
        $muscle = trim((string) $request->query('muscle', ''));
        $equipment = trim((string) $request->query('equipment', ''));
        $difficulty = trim((string) $request->query('difficulty', ''));
        $location = trim((string) $request->query('location', 'all'));
        $visibility = trim((string) $request->query('visibility', 'all'));
        $risk = trim((string) $request->query('risk', 'all'));

        $statsRows = Exercise::query()->get();

        $rows = Exercise::query()
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($inner) use ($search) {
                    $inner
                        ->where('name', 'like', "%{$search}%")
                        ->orWhere('primary_muscle', 'like', "%{$search}%")
                        ->orWhere('equipment', 'like', "%{$search}%")
                        ->orWhere('difficulty', 'like', "%{$search}%");
                });
            })
            ->when($muscle !== '', fn ($query) => $query->where('primary_muscle', $muscle))
            ->when($equipment !== '', function ($query) use ($equipment) {
                $query->where(function ($inner) use ($equipment) {
                    $inner
                        ->where('equipment', $equipment)
                        ->orWhereJsonContains('equipment_list', $equipment);
                });
            })
            ->when($difficulty !== '', fn ($query) => $query->where('difficulty', $difficulty))
            ->when($location === 'home', function ($query) {
                $query->where(function ($inner) {
                    $inner
                        ->where('home_friendly', true)
                        ->orWhereJsonContains('locations', 'home');
                });
            })
            ->when($location === 'gym', fn ($query) => $query->whereJsonContains('locations', 'gym'))
            ->orderBy('name')
            ->paginate((int) $request->query('per_page', 25));

        $exerciseIds = $rows->getCollection()->pluck('id')->all();
        $restrictionMap = $this->restrictionMap($exerciseIds);
        $alternativeMap = $this->alternativeMap($exerciseIds);

        $rows->setCollection($rows->getCollection()
            ->map(fn (Exercise $exercise) => $this->serializeExercise(
                $exercise,
                $restrictionMap[$exercise->id] ?? [],
                $alternativeMap[$exercise->id] ?? [],
            ))
            ->when($visibility !== 'all', fn ($collection) => $collection->filter(fn (array $exercise) => $exercise['visibility'] === $visibility)->values())
            ->when($risk !== 'all', fn ($collection) => $collection->filter(fn (array $exercise) => $exercise['risk_state'] === $risk)->values()));

        return response()->json([
            ...$rows->toArray(),
            'stats' => $this->exerciseStats($statsRows),
            'filters' => [
                'muscles' => $this->distinctValues('primary_muscle'),
                'equipment' => $this->distinctValues('equipment'),
                'difficulties' => $this->distinctValues('difficulty'),
            ],
        ]);
    }

    public function upsert(Request $request, ?Exercise $exercise = null): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:191'],
            'primary_muscle' => ['nullable', 'string', 'max:120'],
            'equipment' => ['nullable', 'string', 'max:120'],
            'difficulty' => ['nullable', 'string', 'max:40'],
            'description' => ['nullable', 'string', 'max:5000'],
            'ai_summary' => ['nullable', 'string', 'max:5000'],
            'movement_pattern' => ['nullable', 'string', 'max:40'],
            'exercise_type' => ['nullable', 'string', 'max:40'],
            'mechanic' => ['nullable', 'string', 'max:40'],
            'plane' => ['nullable', 'string', 'max:40'],
            'home_friendly' => ['nullable', 'boolean'],
            'tags' => ['nullable', 'array'],
            'tags.*' => ['string', 'max:80'],
            'conditions' => ['nullable', 'array'],
            'conditions.*' => ['string', 'max:80'],
            'equipment_list' => ['nullable', 'array'],
            'equipment_list.*' => ['string', 'max:80'],
            'locations' => ['nullable', 'array'],
            'locations.*' => ['string', 'in:home,gym,outdoor'],
            'secondary_muscles' => ['nullable', 'array'],
            'secondary_muscles.*' => ['string', 'max:80'],
        ]);

        $model = $exercise ?: new Exercise;
        $model->fill([
            ...$data,
            'tags' => $this->normalizeList($data['tags'] ?? []),
            'conditions' => $this->normalizeList($data['conditions'] ?? []),
            'equipment_list' => $this->normalizeList($data['equipment_list'] ?? []),
            'locations' => $this->normalizeList($data['locations'] ?? ['gym']),
            'secondary_muscles' => $this->normalizeList($data['secondary_muscles'] ?? []),
        ])->save();

        $this->logger->log(
            $request->user()->id,
            $exercise ? 'admin.exercise.update' : 'admin.exercise.create',
            $model,
            $data,
        );

        return response()->json(['ok' => true, 'exercise' => $this->serializeExercise($model->fresh(), [], [])], $exercise ? 200 : 201);
    }

    public function hide(Request $request, Exercise $exercise): JsonResponse
    {
        $data = $request->validate([
            'reason' => ['nullable', 'string', 'max:2000'],
        ]);

        $tags = array_values(array_unique(array_merge(
            $this->normalizeList($exercise->tags),
            ['admin_hidden', 'invalid_for_ai_search']
        )));
        sort($tags);

        $exercise->forceFill(['tags' => $tags])->save();

        $this->logger->log($request->user()->id, 'admin.exercise.hide', $exercise, [
            'reason' => $data['reason'] ?? null,
            'tags' => $tags,
        ]);

        return response()->json(['ok' => true]);
    }

    public function addAlternative(Request $request, Exercise $exercise): JsonResponse
    {
        $data = $request->validate([
            'substitute_exercise_id' => ['required', 'integer', 'exists:exercises,id'],
            'reason' => ['nullable', 'string', 'max:120'],
            'priority' => ['nullable', 'integer', 'min:1', 'max:20'],
            'note' => ['nullable', 'string', 'max:2000'],
        ]);

        abort_if((int) $data['substitute_exercise_id'] === (int) $exercise->id, 422, 'Choose a different exercise as the alternative.');

        DB::table('exercise_substitutions')->updateOrInsert(
            [
                'exercise_id' => $exercise->id,
                'substitute_exercise_id' => (int) $data['substitute_exercise_id'],
            ],
            [
                'reason' => $data['reason'] ?? 'safety alternative',
                'priority' => $data['priority'] ?? 5,
                'updated_at' => now(),
                'created_at' => now(),
            ],
        );

        $this->logger->log($request->user()->id, 'admin.exercise.add_alternative', $exercise, $data);

        return response()->json(['ok' => true]);
    }

    public function markUnsafe(Request $request, Exercise $exercise): JsonResponse
    {
        $data = $request->validate([
            'restriction_code' => ['required', 'string', 'max:80'],
            'restriction_label' => ['nullable', 'string', 'max:120'],
            'severity' => ['required', 'string', 'in:avoid,caution'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $code = Str::of($data['restriction_code'])->lower()->replaceMatches('/[^a-z0-9]+/u', '_')->trim('_')->value();
        abort_if($code === '', 422, 'Enter a usable injury or restriction type.');

        DB::table('restrictions')->updateOrInsert(
            ['code' => $code],
            [
                'label' => $data['restriction_label'] ?: Str::of($code)->replace('_', ' ')->title()->value(),
                'updated_at' => now(),
                'created_at' => now(),
            ],
        );

        $restrictionId = DB::table('restrictions')->where('code', $code)->value('id');

        DB::table('exercise_restrictions')->updateOrInsert(
            [
                'exercise_id' => $exercise->id,
                'restriction_id' => $restrictionId,
            ],
            [
                'severity' => $data['severity'],
                'notes' => $data['notes'] ?? null,
                'updated_at' => now(),
                'created_at' => now(),
            ],
        );

        $conditions = array_values(array_unique(array_merge($this->normalizeList($exercise->conditions), [$code])));
        $tags = array_values(array_unique(array_merge($this->normalizeList($exercise->tags), ["unsafe_for_{$code}"])));
        sort($conditions);
        sort($tags);
        $exercise->forceFill(['conditions' => $conditions, 'tags' => $tags])->save();

        $this->logger->log($request->user()->id, 'admin.exercise.mark_unsafe', $exercise, [
            ...$data,
            'restriction_code' => $code,
        ]);

        return response()->json(['ok' => true]);
    }

    private function serializeExercise(Exercise $exercise, array $restrictions, array $alternatives): array
    {
        $tags = $this->normalizeList($exercise->tags);
        $conditions = $this->normalizeList($exercise->conditions);
        $locations = $this->normalizeList($exercise->locations);
        $equipmentList = $this->normalizeList($exercise->equipment_list);
        $hidden = in_array('admin_hidden', $tags, true) || in_array('invalid_for_ai_search', $tags, true);
        $avoidCount = collect($restrictions)->where('severity', 'avoid')->count();

        return [
            'id' => $exercise->id,
            'name' => $exercise->name,
            'primary_muscle' => $exercise->primary_muscle,
            'secondary_muscles' => $this->normalizeList($exercise->secondary_muscles),
            'equipment' => $exercise->equipment,
            'equipment_list' => $equipmentList,
            'difficulty' => $exercise->difficulty,
            'description' => $exercise->description,
            'ai_summary' => $exercise->ai_summary,
            'movement_pattern' => $exercise->movement_pattern,
            'exercise_type' => $exercise->exercise_type,
            'mechanic' => $exercise->mechanic,
            'plane' => $exercise->plane,
            'home_friendly' => (bool) $exercise->home_friendly,
            'locations' => $locations,
            'home_gym_compatibility' => [
                'home' => (bool) $exercise->home_friendly || in_array('home', $locations, true),
                'gym' => in_array('gym', $locations, true) || ! (bool) $exercise->home_friendly,
            ],
            'injury_contraindications' => $restrictions,
            'safe_alternatives' => $alternatives,
            'planner_tags' => $tags,
            'conditions' => $conditions,
            'visibility' => $hidden ? 'hidden' : 'visible',
            'risk_state' => $avoidCount > 0 ? 'unsafe' : ($restrictions !== [] || $conditions !== [] ? 'caution' : 'clear'),
            'planner_suitability' => $hidden || $avoidCount > 0 ? 'needs_review' : 'suitable',
            'planner_warnings' => array_values(array_filter([
                $hidden ? 'hidden_from_planner' : null,
                $exercise->primary_muscle ? null : 'missing_muscle_group',
                ($exercise->equipment || $equipmentList !== []) ? null : 'missing_equipment',
                $restrictions !== [] ? count($restrictions).' contraindication(s)' : null,
                $alternatives === [] ? 'missing_safe_alternatives' : null,
            ])),
        ];
    }

    private function exerciseStats($exercises): array
    {
        $ids = $exercises->pluck('id')->all();
        $restrictionCounts = DB::table('exercise_restrictions')
            ->select('exercise_id')
            ->whereIn('exercise_id', $ids)
            ->distinct()
            ->count('exercise_id');
        $alternativeCount = DB::table('exercise_substitutions')
            ->whereIn('exercise_id', $ids)
            ->count();

        return [
            'total' => $exercises->count(),
            'missing_equipment' => $exercises->filter(fn (Exercise $exercise) => ! $exercise->equipment && $this->normalizeList($exercise->equipment_list) === [])->count(),
            'injury_sensitive' => $restrictionCounts,
            'alternative_mappings' => $alternativeCount,
            'hidden' => $exercises->filter(fn (Exercise $exercise) => array_intersect($this->normalizeList($exercise->tags), ['admin_hidden', 'invalid_for_ai_search']) !== [])->count(),
        ];
    }

    private function restrictionMap(array $exerciseIds): array
    {
        if ($exerciseIds === []) {
            return [];
        }

        return DB::table('exercise_restrictions as er')
            ->join('restrictions as r', 'r.id', '=', 'er.restriction_id')
            ->whereIn('er.exercise_id', $exerciseIds)
            ->select(['er.exercise_id', 'r.code', 'r.label', 'er.severity', 'er.notes'])
            ->orderBy('er.severity')
            ->get()
            ->groupBy('exercise_id')
            ->map(fn ($rows) => $rows->map(fn ($row) => [
                'code' => $row->code,
                'label' => $row->label,
                'severity' => $row->severity,
                'notes' => $row->notes,
            ])->values()->all())
            ->all();
    }

    private function alternativeMap(array $exerciseIds): array
    {
        if ($exerciseIds === []) {
            return [];
        }

        return DB::table('exercise_substitutions as es')
            ->join('exercises as substitute', 'substitute.id', '=', 'es.substitute_exercise_id')
            ->whereIn('es.exercise_id', $exerciseIds)
            ->select(['es.exercise_id', 'es.substitute_exercise_id', 'substitute.name', 'substitute.primary_muscle', 'substitute.equipment', 'es.reason', 'es.priority'])
            ->orderBy('es.priority')
            ->get()
            ->groupBy('exercise_id')
            ->map(fn ($rows) => $rows->map(fn ($row) => [
                'id' => (int) $row->substitute_exercise_id,
                'name' => $row->name,
                'primary_muscle' => $row->primary_muscle,
                'equipment' => $row->equipment,
                'reason' => $row->reason,
                'priority' => (int) $row->priority,
            ])->values()->all())
            ->all();
    }

    private function distinctValues(string $column): array
    {
        return Exercise::query()
            ->whereNotNull($column)
            ->where($column, '!=', '')
            ->distinct()
            ->orderBy($column)
            ->pluck($column)
            ->values()
            ->all();
    }

    private function normalizeList(mixed $value): array
    {
        if (is_string($value)) {
            $decoded = json_decode($value, true);
            $value = is_array($decoded) ? $decoded : preg_split('/[\r\n,;]+/', $value);
        }

        if (! is_array($value)) {
            return [];
        }

        return array_values(array_unique(array_filter(array_map(
            static fn ($item): string => trim((string) $item),
            $value,
        ))));
    }
}
