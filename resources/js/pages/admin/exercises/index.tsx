import {
    AdminCheckboxField,
    AdminDataTable,
    AdminEmpty,
    AdminField,
    AdminInput,
    AdminNativeSelect,
    AdminNotice,
    AdminPagination,
    AdminPanel,
    AdminScrollArea,
    AdminStickyBar,
    AdminTextarea,
    AdminToolbar,
    AdminToolbarGroup,
} from '@/components/admin/admin-ui';
import {
    ConfirmActionDialogWithReason,
    StatusChipSet,
} from '@/components/admin/admin-workflows';
import {
    AdminSection,
    AdminShell,
    AdminStatCard,
    AdminStatsGrid,
} from '@/components/admin/AdminShell';
import {
    ProductTableBody,
    ProductTableCell,
    ProductTableEmptyRow,
    ProductTableHead,
    ProductTableHeaderCell,
    ProductTableRow,
} from '@/components/product/table';
import RoleGuard from '@/components/RoleGuard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { jsonRequestInit } from '@/lib/http';
import { Head, Link } from '@inertiajs/react';
import {
    AlertTriangle,
    EyeOff,
    Pencil,
    Plus,
    RefreshCcw,
    ShieldAlert,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

type Restriction = {
    code: string;
    label: string;
    severity: 'avoid' | 'caution' | string;
    notes?: string | null;
};

type Alternative = {
    id: number;
    name: string;
    primary_muscle?: string | null;
    equipment?: string | null;
    reason?: string | null;
    priority?: number;
};

type Exercise = {
    id: number | null;
    name: string;
    primary_muscle?: string | null;
    secondary_muscles?: string[];
    equipment?: string | null;
    equipment_list?: string[];
    difficulty?: string | null;
    description?: string | null;
    ai_summary?: string | null;
    movement_pattern?: string | null;
    exercise_type?: string | null;
    mechanic?: string | null;
    plane?: string | null;
    home_friendly?: boolean;
    locations?: string[];
    home_gym_compatibility?: {
        home: boolean;
        gym: boolean;
    };
    injury_contraindications?: Restriction[];
    safe_alternatives?: Alternative[];
    planner_tags?: string[];
    conditions?: string[];
    visibility?: 'visible' | 'hidden';
    risk_state?: 'clear' | 'caution' | 'unsafe';
    planner_suitability?: 'suitable' | 'needs_review';
    planner_warnings?: string[];
};

type ExerciseResponse = {
    data?: Exercise[];
    total?: number;
    current_page?: number;
    last_page?: number;
    from?: number | null;
    to?: number | null;
    stats?: {
        total: number;
        missing_equipment: number;
        injury_sensitive: number;
        alternative_mappings: number;
        hidden: number;
    };
    filters?: {
        muscles?: string[];
        equipment?: string[];
        difficulties?: string[];
    };
};

const EMPTY_EXERCISE: Exercise = {
    id: null,
    name: '',
    primary_muscle: '',
    secondary_muscles: [],
    equipment: '',
    equipment_list: [],
    difficulty: '',
    description: '',
    ai_summary: '',
    movement_pattern: '',
    exercise_type: 'strength',
    mechanic: '',
    plane: '',
    home_friendly: false,
    locations: ['gym'],
    injury_contraindications: [],
    safe_alternatives: [],
    planner_tags: [],
    conditions: [],
    visibility: 'visible',
    risk_state: 'clear',
    planner_suitability: 'needs_review',
    planner_warnings: [],
};

function listToText(value?: string[]) {
    return (value ?? []).join(', ');
}

function textToList(value: string) {
    return value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
}

function formatBool(value?: boolean) {
    return value ? 'Yes' : 'No';
}

function buildExercisePayload(exercise: Exercise) {
    return {
        name: exercise.name.trim(),
        primary_muscle: exercise.primary_muscle?.trim() || null,
        secondary_muscles: exercise.secondary_muscles ?? [],
        equipment: exercise.equipment?.trim() || null,
        equipment_list: exercise.equipment_list ?? [],
        difficulty: exercise.difficulty?.trim() || null,
        description: exercise.description?.trim() || null,
        ai_summary: exercise.ai_summary?.trim() || null,
        movement_pattern: exercise.movement_pattern?.trim() || null,
        exercise_type: exercise.exercise_type?.trim() || null,
        mechanic: exercise.mechanic?.trim() || null,
        plane: exercise.plane?.trim() || null,
        home_friendly: Boolean(exercise.home_friendly),
        locations: exercise.locations ?? [],
        tags: exercise.planner_tags ?? [],
        conditions: exercise.conditions ?? [],
    };
}

function ExerciseEditor({
    exercise,
    onChange,
    onSave,
    onHide,
    onAddAlternative,
    onMarkUnsafe,
    saving,
}: {
    exercise: Exercise | null;
    onChange: (exercise: Exercise) => void;
    onSave: () => void;
    onHide: () => void;
    onAddAlternative: (payload: {
        substitute_exercise_id: number;
        reason: string;
        priority: number;
        note: string;
    }) => void;
    onMarkUnsafe: (payload: {
        restriction_code: string;
        restriction_label: string;
        severity: string;
        notes: string;
    }) => void;
    saving: boolean;
}) {
    const [alternativeId, setAlternativeId] = useState('');
    const [alternativeReason, setAlternativeReason] = useState('');
    const [alternativePriority, setAlternativePriority] = useState('5');
    const [alternativeNote, setAlternativeNote] = useState('');
    const [restrictionCode, setRestrictionCode] = useState('');
    const [restrictionLabel, setRestrictionLabel] = useState('');
    const [restrictionSeverity, setRestrictionSeverity] = useState('avoid');
    const [restrictionNotes, setRestrictionNotes] = useState('');

    useEffect(() => {
        setAlternativeId('');
        setAlternativeReason('');
        setAlternativePriority('5');
        setAlternativeNote('');
        setRestrictionCode('');
        setRestrictionLabel('');
        setRestrictionSeverity('avoid');
        setRestrictionNotes('');
    }, [exercise?.id]);

    if (!exercise) {
        return (
            <AdminEmpty
                title="Select an exercise"
                description="Open a row to review planner visibility, contraindications, alternatives, and editable catalog metadata."
            />
        );
    }

    return (
        <div className="space-y-4">
            <AdminPanel
                title={exercise.id ? exercise.name : 'Create exercise'}
                description="Safety signals stay visible before action controls because this catalog directly affects planner recommendations."
            >
                <div className="space-y-4">
                    <StatusChipSet
                        items={[
                            {
                                value: exercise.visibility ?? 'visible',
                                label:
                                    exercise.visibility === 'hidden'
                                        ? 'Hidden'
                                        : 'Visible',
                            },
                            {
                                value: exercise.risk_state ?? 'clear',
                                label:
                                    exercise.risk_state === 'unsafe'
                                        ? 'Unsafe'
                                        : exercise.risk_state === 'caution'
                                          ? 'Caution'
                                          : 'Clear',
                            },
                            {
                                value:
                                    exercise.planner_suitability ??
                                    'needs_review',
                                label:
                                    exercise.planner_suitability ===
                                    'suitable'
                                        ? 'Planner suitable'
                                        : 'Planner review',
                            },
                        ]}
                    />

                    {(exercise.planner_warnings ?? []).length > 0 ? (
                        <AdminNotice tone="warning">
                            Planner warnings:{' '}
                            {(exercise.planner_warnings ?? []).join(', ')}.
                        </AdminNotice>
                    ) : null}

                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        <div className="dashboard-surface-soft rounded-[20px] px-4 py-4">
                            <div className="text-[11px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                                Home compatible
                            </div>
                            <div className="mt-2 text-lg font-semibold text-foreground">
                                {formatBool(
                                    exercise.home_gym_compatibility?.home,
                                )}
                            </div>
                        </div>
                        <div className="dashboard-surface-soft rounded-[20px] px-4 py-4">
                            <div className="text-[11px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                                Gym compatible
                            </div>
                            <div className="mt-2 text-lg font-semibold text-foreground">
                                {formatBool(
                                    exercise.home_gym_compatibility?.gym,
                                )}
                            </div>
                        </div>
                        <div className="dashboard-surface-soft rounded-[20px] px-4 py-4">
                            <div className="text-[11px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                                Alternatives
                            </div>
                            <div className="mt-2 text-lg font-semibold text-foreground">
                                {(exercise.safe_alternatives ?? []).length}
                            </div>
                        </div>
                    </div>
                </div>
            </AdminPanel>

            <AdminPanel
                title="Catalog identity"
                description="Keep searchable labels and planner classification concise and consistent."
            >
                <div className="grid gap-4 md:grid-cols-2">
                    <AdminField label="Exercise name">
                        <AdminInput
                            value={exercise.name}
                            onChange={(event) =>
                                onChange({
                                    ...exercise,
                                    name: event.target.value,
                                })
                            }
                        />
                    </AdminField>
                    <AdminField label="Muscle group">
                        <AdminInput
                            value={exercise.primary_muscle ?? ''}
                            onChange={(event) =>
                                onChange({
                                    ...exercise,
                                    primary_muscle: event.target.value,
                                })
                            }
                        />
                    </AdminField>
                    <AdminField label="Equipment">
                        <AdminInput
                            value={exercise.equipment ?? ''}
                            onChange={(event) =>
                                onChange({
                                    ...exercise,
                                    equipment: event.target.value,
                                })
                            }
                        />
                    </AdminField>
                    <AdminField label="Difficulty">
                        <AdminInput
                            value={exercise.difficulty ?? ''}
                            onChange={(event) =>
                                onChange({
                                    ...exercise,
                                    difficulty: event.target.value,
                                })
                            }
                        />
                    </AdminField>
                    <AdminField label="Secondary muscles">
                        <AdminInput
                            value={listToText(exercise.secondary_muscles)}
                            onChange={(event) =>
                                onChange({
                                    ...exercise,
                                    secondary_muscles: textToList(
                                        event.target.value,
                                    ),
                                })
                            }
                        />
                    </AdminField>
                    <AdminField label="Equipment list">
                        <AdminInput
                            value={listToText(exercise.equipment_list)}
                            onChange={(event) =>
                                onChange({
                                    ...exercise,
                                    equipment_list: textToList(
                                        event.target.value,
                                    ),
                                })
                            }
                        />
                    </AdminField>
                    <AdminField label="Movement pattern">
                        <AdminInput
                            value={exercise.movement_pattern ?? ''}
                            onChange={(event) =>
                                onChange({
                                    ...exercise,
                                    movement_pattern: event.target.value,
                                })
                            }
                        />
                    </AdminField>
                    <AdminField label="Exercise type">
                        <AdminInput
                            value={exercise.exercise_type ?? ''}
                            onChange={(event) =>
                                onChange({
                                    ...exercise,
                                    exercise_type: event.target.value,
                                })
                            }
                        />
                    </AdminField>
                    <AdminField label="Mechanic">
                        <AdminInput
                            value={exercise.mechanic ?? ''}
                            onChange={(event) =>
                                onChange({
                                    ...exercise,
                                    mechanic: event.target.value,
                                })
                            }
                        />
                    </AdminField>
                    <AdminField label="Plane">
                        <AdminInput
                            value={exercise.plane ?? ''}
                            onChange={(event) =>
                                onChange({
                                    ...exercise,
                                    plane: event.target.value,
                                })
                            }
                        />
                    </AdminField>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <AdminCheckboxField
                        checked={Boolean(exercise.home_friendly)}
                        onCheckedChange={(checked) =>
                            onChange({ ...exercise, home_friendly: checked })
                        }
                        label="Home friendly"
                        description="Allows the planner to consider this movement for home workouts when equipment also fits."
                    />
                    <AdminField label="Locations" helper="Comma-separated: home, gym, outdoor.">
                        <AdminInput
                            value={listToText(exercise.locations)}
                            onChange={(event) =>
                                onChange({
                                    ...exercise,
                                    locations: textToList(event.target.value),
                                })
                            }
                        />
                    </AdminField>
                </div>
            </AdminPanel>

            <AdminPanel
                title="Injury contraindications"
                description="Use vertical review blocks here. Contraindications should never be crammed into small cards."
            >
                <div className="space-y-3">
                    {(exercise.injury_contraindications ?? []).map(
                        (restriction) => (
                            <div
                                key={`${restriction.code}-${restriction.severity}`}
                                className="dashboard-surface-soft rounded-[20px] px-4 py-4"
                            >
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="font-semibold text-foreground">
                                            {restriction.label ||
                                                restriction.code}
                                        </div>
                                        <div className="mt-1 text-sm leading-6 text-muted-foreground">
                                            {restriction.notes ||
                                                'No reviewer note recorded.'}
                                        </div>
                                    </div>
                                    <StatusChipSet
                                        items={[
                                            {
                                                value: restriction.severity,
                                                label:
                                                    restriction.severity ===
                                                    'avoid'
                                                        ? 'Avoid'
                                                        : 'Caution',
                                            },
                                        ]}
                                    />
                                </div>
                            </div>
                        ),
                    )}
                    {(exercise.injury_contraindications ?? []).length === 0 ? (
                        <AdminEmpty
                            title="No contraindications recorded"
                            description="Add injury restrictions before marking the exercise planner-ready for sensitive users."
                        />
                    ) : null}
                </div>

                {exercise.id ? (
                    <div className="mt-4 rounded-[22px] border border-border/60 bg-background/56 p-4">
                        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                            <ShieldAlert className="h-4 w-4 text-destructive" />
                            Mark unsafe for injury type
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                            <AdminField label="Restriction code">
                                <AdminInput
                                    value={restrictionCode}
                                    placeholder="knee_pain"
                                    onChange={(event) =>
                                        setRestrictionCode(event.target.value)
                                    }
                                />
                            </AdminField>
                            <AdminField label="Display label">
                                <AdminInput
                                    value={restrictionLabel}
                                    placeholder="Knee pain"
                                    onChange={(event) =>
                                        setRestrictionLabel(event.target.value)
                                    }
                                />
                            </AdminField>
                            <AdminField label="Severity">
                                <AdminNativeSelect
                                    value={restrictionSeverity}
                                    onChange={(event) =>
                                        setRestrictionSeverity(
                                            event.target.value,
                                        )
                                    }
                                >
                                    <option value="avoid">Avoid</option>
                                    <option value="caution">Caution</option>
                                </AdminNativeSelect>
                            </AdminField>
                            <AdminField label="Reviewer note">
                                <AdminTextarea
                                    rows={4}
                                    value={restrictionNotes}
                                    onChange={(event) =>
                                        setRestrictionNotes(event.target.value)
                                    }
                                    placeholder="Explain the movement risk and safer constraints."
                                />
                            </AdminField>
                        </div>
                        <Button
                            type="button"
                            className="mt-4"
                            variant="outline"
                            disabled={saving || restrictionCode.trim() === ''}
                            onClick={() =>
                                onMarkUnsafe({
                                    restriction_code: restrictionCode,
                                    restriction_label: restrictionLabel,
                                    severity: restrictionSeverity,
                                    notes: restrictionNotes,
                                })
                            }
                        >
                            <AlertTriangle className="h-4 w-4" />
                            Mark unsafe
                        </Button>
                    </div>
                ) : null}
            </AdminPanel>

            <AdminPanel
                title="Safe alternatives"
                description="Alternatives give the planner and coach somewhere safer to go when an exercise conflicts with injury, location, or equipment."
            >
                <div className="space-y-3">
                    {(exercise.safe_alternatives ?? []).map((alternative) => (
                        <div
                            key={`${alternative.id}-${alternative.reason ?? ''}`}
                            className="dashboard-surface-soft rounded-[20px] px-4 py-4"
                        >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                    <div className="font-semibold text-foreground">
                                        {alternative.name}
                                    </div>
                                    <div className="mt-1 text-sm text-muted-foreground">
                                        {alternative.primary_muscle ||
                                            'No muscle group'}{' '}
                                        |{' '}
                                        {alternative.equipment ||
                                            'No equipment'}
                                    </div>
                                    <div className="mt-2 text-sm leading-6 text-muted-foreground">
                                        {alternative.reason ||
                                            'No alternative reason recorded.'}
                                    </div>
                                </div>
                                <Badge variant="outline">
                                    Priority {alternative.priority ?? 5}
                                </Badge>
                            </div>
                        </div>
                    ))}
                    {(exercise.safe_alternatives ?? []).length === 0 ? (
                        <AdminEmpty
                            title="No safe alternatives mapped"
                            description="Add at least one substitute for injury-sensitive or equipment-limited movements."
                        />
                    ) : null}
                </div>

                {exercise.id ? (
                    <div className="mt-4 rounded-[22px] border border-border/60 bg-background/56 p-4">
                        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                            <Plus className="h-4 w-4 text-primary" />
                            Add alternative
                        </div>
                        <div className="grid gap-4 md:grid-cols-3">
                            <AdminField label="Alternative exercise ID">
                                <AdminInput
                                    value={alternativeId}
                                    inputMode="numeric"
                                    placeholder="123"
                                    onChange={(event) =>
                                        setAlternativeId(event.target.value)
                                    }
                                />
                            </AdminField>
                            <AdminField label="Reason">
                                <AdminInput
                                    value={alternativeReason}
                                    placeholder="knee-friendly"
                                    onChange={(event) =>
                                        setAlternativeReason(event.target.value)
                                    }
                                />
                            </AdminField>
                            <AdminField label="Priority">
                                <AdminInput
                                    type="number"
                                    value={alternativePriority}
                                    onChange={(event) =>
                                        setAlternativePriority(
                                            event.target.value,
                                        )
                                    }
                                />
                            </AdminField>
                        </div>
                        <div className="mt-4">
                            <AdminField label="Admin note">
                                <AdminTextarea
                                    rows={3}
                                    value={alternativeNote}
                                    onChange={(event) =>
                                        setAlternativeNote(event.target.value)
                                    }
                                    placeholder="Why this alternative is safer or more realistic."
                                />
                            </AdminField>
                        </div>
                        <Button
                            type="button"
                            className="mt-4"
                            variant="outline"
                            disabled={
                                saving ||
                                !Number.isFinite(Number(alternativeId)) ||
                                Number(alternativeId) <= 0
                            }
                            onClick={() =>
                                onAddAlternative({
                                    substitute_exercise_id:
                                        Number(alternativeId),
                                    reason: alternativeReason,
                                    priority:
                                        Number(alternativePriority) || 5,
                                    note: alternativeNote,
                                })
                            }
                        >
                            <Plus className="h-4 w-4" />
                            Add alternative
                        </Button>
                    </div>
                ) : null}
            </AdminPanel>

            <AdminPanel
                title="Planner tags and summary"
                description="Readable planner metadata only. Raw safety audit data stays in diagnostics."
            >
                <div className="grid gap-4 md:grid-cols-2">
                    <AdminField label="Planner tags">
                        <AdminTextarea
                            rows={4}
                            value={listToText(exercise.planner_tags)}
                            onChange={(event) =>
                                onChange({
                                    ...exercise,
                                    planner_tags: textToList(
                                        event.target.value,
                                    ),
                                })
                            }
                        />
                    </AdminField>
                    <AdminField label="Injury conditions">
                        <AdminTextarea
                            rows={4}
                            value={listToText(exercise.conditions)}
                            onChange={(event) =>
                                onChange({
                                    ...exercise,
                                    conditions: textToList(event.target.value),
                                })
                            }
                        />
                    </AdminField>
                    <AdminField label="Description">
                        <AdminTextarea
                            rows={5}
                            value={exercise.description ?? ''}
                            onChange={(event) =>
                                onChange({
                                    ...exercise,
                                    description: event.target.value,
                                })
                            }
                        />
                    </AdminField>
                    <AdminField label="AI summary">
                        <AdminTextarea
                            rows={5}
                            value={exercise.ai_summary ?? ''}
                            onChange={(event) =>
                                onChange({
                                    ...exercise,
                                    ai_summary: event.target.value,
                                })
                            }
                        />
                    </AdminField>
                </div>
            </AdminPanel>

            <AdminStickyBar
                summary={
                    exercise.id
                        ? `Editing exercise #${exercise.id}`
                        : 'Creating exercise'
                }
            >
                <Button
                    type="button"
                    onClick={onSave}
                    disabled={saving || exercise.name.trim() === ''}
                >
                    <Pencil className="h-4 w-4" />
                    {saving ? 'Saving...' : 'Save exercise'}
                </Button>
                {exercise.id ? (
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onHide}
                        disabled={saving}
                    >
                        <EyeOff className="h-4 w-4" />
                        Hide
                    </Button>
                ) : null}
                <Button asChild type="button" variant="outline">
                    <Link href="/admin/logs">Audit logs</Link>
                </Button>
            </AdminStickyBar>
        </div>
    );
}

export default function AdminExercisesPage() {
    const [exercises, setExercises] = useState<Exercise[]>([]);
    const [query, setQuery] = useState('');
    const [muscle, setMuscle] = useState('all');
    const [equipment, setEquipment] = useState('all');
    const [difficulty, setDifficulty] = useState('all');
    const [location, setLocation] = useState('all');
    const [risk, setRisk] = useState('all');
    const [visibility, setVisibility] = useState('all');
    const [muscles, setMuscles] = useState<string[]>([]);
    const [equipmentOptions, setEquipmentOptions] = useState<string[]>([]);
    const [difficultyOptions, setDifficultyOptions] = useState<string[]>([]);
    const [selectedExercise, setSelectedExercise] =
        useState<Exercise | null>(null);
    const [hideOpen, setHideOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);
    const [from, setFrom] = useState<number | null>(null);
    const [to, setTo] = useState<number | null>(null);
    const [total, setTotal] = useState(0);
    const [stats, setStats] = useState({
        total: 0,
        missing_equipment: 0,
        injury_sensitive: 0,
        alternative_mappings: 0,
        hidden: 0,
    });

    const selectedId = selectedExercise?.id ?? null;

    const loadExercises = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const params = new URLSearchParams({
                page: String(currentPage),
                per_page: '25',
            });

            if (query.trim()) params.set('q', query.trim());
            if (muscle !== 'all') params.set('muscle', muscle);
            if (equipment !== 'all') params.set('equipment', equipment);
            if (difficulty !== 'all') params.set('difficulty', difficulty);
            if (location !== 'all') params.set('location', location);
            if (risk !== 'all') params.set('risk', risk);
            if (visibility !== 'all') params.set('visibility', visibility);

            const response = await fetch(
                `/api/admin/exercises?${params.toString()}`,
                { headers: { Accept: 'application/json' } },
            );

            if (!response.ok) {
                throw new Error('Could not load exercise catalog.');
            }

            const json = (await response.json()) as ExerciseResponse;
            const rows = Array.isArray(json.data) ? json.data : [];

            setExercises(rows);
            setMuscles(
                Array.isArray(json.filters?.muscles)
                    ? json.filters.muscles
                    : [],
            );
            setEquipmentOptions(
                Array.isArray(json.filters?.equipment)
                    ? json.filters.equipment
                    : [],
            );
            setDifficultyOptions(
                Array.isArray(json.filters?.difficulties)
                    ? json.filters.difficulties
                    : [],
            );
            setStats({
                total: Number(json.stats?.total ?? 0),
                missing_equipment: Number(json.stats?.missing_equipment ?? 0),
                injury_sensitive: Number(json.stats?.injury_sensitive ?? 0),
                alternative_mappings: Number(
                    json.stats?.alternative_mappings ?? 0,
                ),
                hidden: Number(json.stats?.hidden ?? 0),
            });
            setTotal(Number(json.total ?? 0));
            setCurrentPage(Number(json.current_page ?? 1));
            setLastPage(Number(json.last_page ?? 1));
            setFrom(json.from ?? null);
            setTo(json.to ?? null);
            setSelectedExercise((current) => {
                if (current?.id === null) return current;
                if (!current) return rows[0] ?? null;

                return rows.find((exercise) => exercise.id === current.id) ?? current;
            });
        } catch (loadError) {
            setError(
                loadError instanceof Error
                    ? loadError.message
                    : 'Could not load exercise catalog.',
            );
        } finally {
            setLoading(false);
        }
    }, [
        currentPage,
        difficulty,
        equipment,
        location,
        muscle,
        query,
        risk,
        visibility,
    ]);

    useEffect(() => {
        void loadExercises();
    }, [loadExercises]);

    useEffect(() => {
        setCurrentPage(1);
    }, [difficulty, equipment, location, muscle, query, risk, visibility]);

    const filterChips = useMemo(
        () =>
            [
                muscle !== 'all' ? { value: 'muscle', label: muscle } : null,
                equipment !== 'all'
                    ? { value: 'equipment', label: equipment }
                    : null,
                difficulty !== 'all'
                    ? { value: 'difficulty', label: difficulty }
                    : null,
                location !== 'all'
                    ? { value: 'location', label: location }
                    : null,
                risk !== 'all' ? { value: risk, label: risk } : null,
                visibility !== 'all'
                    ? { value: visibility, label: visibility }
                    : null,
            ].filter(Boolean) as Array<{ value: string; label: string }>,
        [difficulty, equipment, location, muscle, risk, visibility],
    );

    async function saveExercise() {
        if (!selectedExercise) return;

        setSaving(true);
        setError(null);
        setSuccess(null);

        try {
            const response = await fetch(
                selectedExercise.id
                    ? `/api/admin/exercises/${selectedExercise.id}`
                    : '/api/admin/exercises',
                jsonRequestInit(
                    selectedExercise.id ? 'PUT' : 'POST',
                    buildExercisePayload(selectedExercise),
                ),
            );

            if (!response.ok) {
                const json = (await response.json().catch(() => null)) as {
                    message?: string;
                } | null;
                throw new Error(json?.message || 'Could not save exercise.');
            }

            setSuccess('Exercise saved.');
            await loadExercises();
        } catch (saveError) {
            setError(
                saveError instanceof Error
                    ? saveError.message
                    : 'Could not save exercise.',
            );
        } finally {
            setSaving(false);
        }
    }

    async function hideExercise(reason: string) {
        if (!selectedExercise?.id) return;

        setSaving(true);
        setError(null);
        setSuccess(null);

        try {
            const response = await fetch(
                `/api/admin/exercises/${selectedExercise.id}/hide`,
                jsonRequestInit('PATCH', { reason }),
            );

            if (!response.ok) {
                throw new Error('Could not hide exercise.');
            }

            setHideOpen(false);
            setSuccess('Exercise hidden from planner suitability.');
            await loadExercises();
        } catch (hideError) {
            setError(
                hideError instanceof Error
                    ? hideError.message
                    : 'Could not hide exercise.',
            );
        } finally {
            setSaving(false);
        }
    }

    async function addAlternative(payload: {
        substitute_exercise_id: number;
        reason: string;
        priority: number;
        note: string;
    }) {
        if (!selectedExercise?.id) return;

        setSaving(true);
        setError(null);
        setSuccess(null);

        try {
            const response = await fetch(
                `/api/admin/exercises/${selectedExercise.id}/alternatives`,
                jsonRequestInit('POST', payload),
            );

            if (!response.ok) {
                const json = (await response.json().catch(() => null)) as {
                    message?: string;
                } | null;
                throw new Error(
                    json?.message || 'Could not add safe alternative.',
                );
            }

            setSuccess('Safe alternative saved.');
            await loadExercises();
        } catch (alternativeError) {
            setError(
                alternativeError instanceof Error
                    ? alternativeError.message
                    : 'Could not add safe alternative.',
            );
        } finally {
            setSaving(false);
        }
    }

    async function markUnsafe(payload: {
        restriction_code: string;
        restriction_label: string;
        severity: string;
        notes: string;
    }) {
        if (!selectedExercise?.id) return;

        setSaving(true);
        setError(null);
        setSuccess(null);

        try {
            const response = await fetch(
                `/api/admin/exercises/${selectedExercise.id}/restrictions`,
                jsonRequestInit('POST', payload),
            );

            if (!response.ok) {
                const json = (await response.json().catch(() => null)) as {
                    message?: string;
                } | null;
                throw new Error(
                    json?.message || 'Could not mark exercise unsafe.',
                );
            }

            setSuccess('Injury restriction saved.');
            await loadExercises();
        } catch (unsafeError) {
            setError(
                unsafeError instanceof Error
                    ? unsafeError.message
                    : 'Could not mark exercise unsafe.',
            );
        } finally {
            setSaving(false);
        }
    }

    return (
        <>
            <Head title="Admin Exercise Catalog" />
            <RoleGuard roles={['admin']}>
                <AdminShell
                    title="Exercise Catalog"
                    description="Workout safety and planner quality controls for exercise metadata, contraindications, alternatives, and visibility."
                >
                    <div className="space-y-6">
                        <AdminStatsGrid>
                            <AdminStatCard
                                label="Exercises"
                                value={loading ? '...' : String(stats.total)}
                                tone="accent"
                                helper="Catalog items available to planner workflows."
                            />
                            <AdminStatCard
                                label="Missing equipment"
                                value={
                                    loading
                                        ? '...'
                                        : String(stats.missing_equipment)
                                }
                                helper="Exercises that need equipment metadata."
                            />
                            <AdminStatCard
                                label="Injury-sensitive"
                                value={
                                    loading
                                        ? '...'
                                        : String(stats.injury_sensitive)
                                }
                                helper="Exercises with caution or avoid rules."
                            />
                            <AdminStatCard
                                label="Alternatives"
                                value={
                                    loading
                                        ? '...'
                                        : String(stats.alternative_mappings)
                                }
                                helper="Mapped substitutes for safer planning."
                            />
                            <AdminStatCard
                                label="Hidden"
                                value={loading ? '...' : String(stats.hidden)}
                                helper="Items excluded from planner suitability."
                            />
                        </AdminStatsGrid>

                        {error ? <AdminNotice tone="danger">{error}</AdminNotice> : null}
                        {success ? (
                            <AdminNotice tone="success">{success}</AdminNotice>
                        ) : null}

                        <AdminSection
                            title="Safety Guidance"
                            description="Exercise catalog edits can change AI workout recommendations. Review injury rules and alternatives before marking an item planner-ready."
                        >
                            <div className="grid gap-4 lg:grid-cols-3">
                                <AdminPanel
                                    title="Contraindications first"
                                    description="Avoid and caution rules are shown before edit actions so admins see what the AI must not suggest."
                                >
                                    <div className="dashboard-surface-soft rounded-[20px] px-4 py-4 text-sm leading-6 text-muted-foreground">
                                        Use avoid for exercises the planner
                                        should block for an injury type. Use
                                        caution when a trainer review or
                                        lighter variation is acceptable.
                                    </div>
                                </AdminPanel>
                                <AdminPanel
                                    title="Alternatives matter"
                                    description="A hidden or unsafe exercise should have realistic substitutes whenever possible."
                                >
                                    <div className="dashboard-surface-soft rounded-[20px] px-4 py-4 text-sm leading-6 text-muted-foreground">
                                        Prefer alternatives with matching muscle
                                        group, available equipment, and lower
                                        joint stress.
                                    </div>
                                </AdminPanel>
                                <AdminPanel
                                    title="Audit trail stays separate"
                                    description="This page keeps exercise editing focused and links out to audit logs instead of crowding the workspace with history detail."
                                >
                                    <Button asChild type="button" variant="outline">
                                        <Link href="/admin/logs">
                                            Open audit logs
                                        </Link>
                                    </Button>
                                </AdminPanel>
                            </div>
                        </AdminSection>

                        <AdminSection
                            title="Filters"
                            description="Filter by planner-relevant metadata before editing safety rules or visibility."
                        >
                            <AdminToolbar>
                                <AdminToolbarGroup grow>
                                    <AdminField label="Search" className="xl:flex-1">
                                        <AdminInput
                                            value={query}
                                            placeholder="Search exercise, muscle, equipment"
                                            onChange={(event) =>
                                                setQuery(event.target.value)
                                            }
                                        />
                                    </AdminField>
                                    <AdminField label="Muscle" className="sm:w-48">
                                        <AdminNativeSelect
                                            value={muscle}
                                            onChange={(event) =>
                                                setMuscle(event.target.value)
                                            }
                                        >
                                            <option value="all">All muscles</option>
                                            {muscles.map((option) => (
                                                <option
                                                    key={option}
                                                    value={option}
                                                >
                                                    {option}
                                                </option>
                                            ))}
                                        </AdminNativeSelect>
                                    </AdminField>
                                    <AdminField label="Equipment" className="sm:w-48">
                                        <AdminNativeSelect
                                            value={equipment}
                                            onChange={(event) =>
                                                setEquipment(event.target.value)
                                            }
                                        >
                                            <option value="all">All equipment</option>
                                            {equipmentOptions.map((option) => (
                                                <option
                                                    key={option}
                                                    value={option}
                                                >
                                                    {option}
                                                </option>
                                            ))}
                                        </AdminNativeSelect>
                                    </AdminField>
                                    <AdminField label="Difficulty" className="sm:w-44">
                                        <AdminNativeSelect
                                            value={difficulty}
                                            onChange={(event) =>
                                                setDifficulty(
                                                    event.target.value,
                                                )
                                            }
                                        >
                                            <option value="all">All levels</option>
                                            {difficultyOptions.map((option) => (
                                                <option
                                                    key={option}
                                                    value={option}
                                                >
                                                    {option}
                                                </option>
                                            ))}
                                        </AdminNativeSelect>
                                    </AdminField>
                                    <AdminField label="Location" className="sm:w-40">
                                        <AdminNativeSelect
                                            value={location}
                                            onChange={(event) =>
                                                setLocation(event.target.value)
                                            }
                                        >
                                            <option value="all">Any</option>
                                            <option value="home">Home</option>
                                            <option value="gym">Gym</option>
                                        </AdminNativeSelect>
                                    </AdminField>
                                    <AdminField label="Risk" className="sm:w-40">
                                        <AdminNativeSelect
                                            value={risk}
                                            onChange={(event) =>
                                                setRisk(event.target.value)
                                            }
                                        >
                                            <option value="all">All risk</option>
                                            <option value="unsafe">Unsafe</option>
                                            <option value="caution">Caution</option>
                                            <option value="clear">Clear</option>
                                        </AdminNativeSelect>
                                    </AdminField>
                                    <AdminField label="Visibility" className="sm:w-40">
                                        <AdminNativeSelect
                                            value={visibility}
                                            onChange={(event) =>
                                                setVisibility(
                                                    event.target.value,
                                                )
                                            }
                                        >
                                            <option value="all">All</option>
                                            <option value="visible">Visible</option>
                                            <option value="hidden">Hidden</option>
                                        </AdminNativeSelect>
                                    </AdminField>
                                </AdminToolbarGroup>
                                <AdminToolbarGroup className="w-full xl:w-auto xl:justify-end">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => void loadExercises()}
                                        disabled={loading}
                                    >
                                        <RefreshCcw className="h-4 w-4" />
                                        Refresh
                                    </Button>
                                    <Button
                                        type="button"
                                        onClick={() =>
                                            setSelectedExercise({
                                                ...EMPTY_EXERCISE,
                                            })
                                        }
                                    >
                                        <Plus className="h-4 w-4" />
                                        Create
                                    </Button>
                                </AdminToolbarGroup>
                            </AdminToolbar>

                            {filterChips.length > 0 ? (
                                <StatusChipSet
                                    className="mt-3"
                                    items={filterChips}
                                />
                            ) : null}
                        </AdminSection>

                        <AdminSection
                            title="Exercise Table"
                            description={
                                from && to
                                    ? `Showing ${from}-${to} of ${total} exercises.`
                                    : 'Select a row to open the detail editor below.'
                            }
                        >
                            {loading && exercises.length === 0 ? (
                                <AdminEmpty
                                    title="Loading exercises"
                                    description="Fetching planner metadata, contraindication summaries, and safe alternatives."
                                />
                            ) : (
                                <AdminScrollArea maxHeightClassName="max-h-[64vh]">
                                    <AdminDataTable tableClassName="min-w-[1160px]">
                                        <ProductTableHead>
                                            <tr>
                                                <ProductTableHeaderCell>
                                                    Exercise
                                                </ProductTableHeaderCell>
                                                <ProductTableHeaderCell>
                                                    Muscle
                                                </ProductTableHeaderCell>
                                                <ProductTableHeaderCell>
                                                    Equipment
                                                </ProductTableHeaderCell>
                                                <ProductTableHeaderCell>
                                                    Difficulty
                                                </ProductTableHeaderCell>
                                                <ProductTableHeaderCell>
                                                    Home / gym
                                                </ProductTableHeaderCell>
                                                <ProductTableHeaderCell>
                                                    Contraindications
                                                </ProductTableHeaderCell>
                                                <ProductTableHeaderCell>
                                                    Alternatives
                                                </ProductTableHeaderCell>
                                                <ProductTableHeaderCell>
                                                    Planner tags
                                                </ProductTableHeaderCell>
                                                <ProductTableHeaderCell>
                                                    Visibility
                                                </ProductTableHeaderCell>
                                                <ProductTableHeaderCell className="w-32">
                                                    Actions
                                                </ProductTableHeaderCell>
                                            </tr>
                                        </ProductTableHead>
                                        <ProductTableBody>
                                            {exercises.map((exercise) => (
                                                <ProductTableRow
                                                    key={exercise.id}
                                                    interactive
                                                    className={
                                                        exercise.id === selectedId
                                                            ? 'bg-primary/5'
                                                            : undefined
                                                    }
                                                >
                                                    <ProductTableCell>
                                                        <button
                                                            type="button"
                                                            className="w-full text-left"
                                                            onClick={() =>
                                                                setSelectedExercise(
                                                                    exercise,
                                                                )
                                                            }
                                                        >
                                                            <div className="font-medium text-foreground">
                                                                {exercise.name}
                                                            </div>
                                                            <div className="text-xs text-muted-foreground">
                                                                {exercise.exercise_type ||
                                                                    'No type'}
                                                            </div>
                                                        </button>
                                                    </ProductTableCell>
                                                    <ProductTableCell>
                                                        <div className="font-medium text-foreground">
                                                            {exercise.primary_muscle ||
                                                                '-'}
                                                        </div>
                                                        <div className="line-clamp-1 text-xs text-muted-foreground">
                                                            {(
                                                                exercise.secondary_muscles ??
                                                                []
                                                            ).join(', ') ||
                                                                'No secondary muscles'}
                                                        </div>
                                                    </ProductTableCell>
                                                    <ProductTableCell>
                                                        <div className="font-medium text-foreground">
                                                            {exercise.equipment ||
                                                                '-'}
                                                        </div>
                                                        <div className="line-clamp-1 text-xs text-muted-foreground">
                                                            {(
                                                                exercise.equipment_list ??
                                                                []
                                                            ).join(', ') ||
                                                                'No equipment list'}
                                                        </div>
                                                    </ProductTableCell>
                                                    <ProductTableCell>
                                                        {exercise.difficulty || '-'}
                                                    </ProductTableCell>
                                                    <ProductTableCell>
                                                        <div className="flex flex-wrap gap-1">
                                                            <Badge variant="outline">
                                                                Home{' '}
                                                                {formatBool(
                                                                    exercise
                                                                        .home_gym_compatibility
                                                                        ?.home,
                                                                )}
                                                            </Badge>
                                                            <Badge variant="outline">
                                                                Gym{' '}
                                                                {formatBool(
                                                                    exercise
                                                                        .home_gym_compatibility
                                                                        ?.gym,
                                                                )}
                                                            </Badge>
                                                        </div>
                                                    </ProductTableCell>
                                                    <ProductTableCell>
                                                        <div className="space-y-1">
                                                            <StatusChipSet
                                                                items={[
                                                                    {
                                                                        value:
                                                                            exercise.risk_state ??
                                                                            'clear',
                                                                        label:
                                                                            exercise.risk_state ===
                                                                            'unsafe'
                                                                                ? 'Unsafe'
                                                                                : exercise.risk_state ===
                                                                                    'caution'
                                                                                  ? 'Caution'
                                                                                  : 'Clear',
                                                                    },
                                                                ]}
                                                            />
                                                            <div className="line-clamp-1 max-w-52 text-xs text-muted-foreground">
                                                                {(
                                                                    exercise.injury_contraindications ??
                                                                    []
                                                                )
                                                                    .map(
                                                                        (item) =>
                                                                            item.label ||
                                                                            item.code,
                                                                    )
                                                                    .join(', ') ||
                                                                    'None recorded'}
                                                            </div>
                                                        </div>
                                                    </ProductTableCell>
                                                    <ProductTableCell>
                                                        <div className="font-medium text-foreground">
                                                            {(
                                                                exercise.safe_alternatives ??
                                                                []
                                                            ).length}
                                                        </div>
                                                        <div className="line-clamp-1 max-w-44 text-xs text-muted-foreground">
                                                            {(
                                                                exercise.safe_alternatives ??
                                                                []
                                                            )
                                                                .map(
                                                                    (item) =>
                                                                        item.name,
                                                                )
                                                                .join(', ') ||
                                                                'No alternatives'}
                                                        </div>
                                                    </ProductTableCell>
                                                    <ProductTableCell>
                                                        <div className="flex max-w-52 flex-wrap gap-1">
                                                            {(
                                                                exercise.planner_tags ??
                                                                []
                                                            )
                                                                .slice(0, 3)
                                                                .map((tag) => (
                                                                    <Badge
                                                                        key={tag}
                                                                        variant="secondary"
                                                                    >
                                                                        {tag}
                                                                    </Badge>
                                                                ))}
                                                            {(
                                                                exercise.planner_tags ??
                                                                []
                                                            ).length === 0 ? (
                                                                <span className="text-xs text-muted-foreground">
                                                                    No tags
                                                                </span>
                                                            ) : null}
                                                        </div>
                                                    </ProductTableCell>
                                                    <ProductTableCell>
                                                        <StatusChipSet
                                                            items={[
                                                                {
                                                                    value:
                                                                        exercise.visibility ??
                                                                        'visible',
                                                                    label:
                                                                        exercise.visibility ===
                                                                        'hidden'
                                                                            ? 'Hidden'
                                                                            : 'Visible',
                                                                },
                                                            ]}
                                                        />
                                                    </ProductTableCell>
                                                    <ProductTableCell>
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() =>
                                                                setSelectedExercise(
                                                                    exercise,
                                                                )
                                                            }
                                                        >
                                                            Edit
                                                        </Button>
                                                    </ProductTableCell>
                                                </ProductTableRow>
                                            ))}

                                            {!loading &&
                                            exercises.length === 0 ? (
                                                <ProductTableEmptyRow
                                                    colSpan={10}
                                                    title="No exercises found"
                                                    description="Adjust filters or create a new exercise catalog item."
                                                />
                                            ) : null}
                                        </ProductTableBody>
                                    </AdminDataTable>
                                </AdminScrollArea>
                            )}

                            <AdminPagination
                                currentPage={currentPage}
                                lastPage={lastPage}
                                disabled={loading}
                                summary={
                                    from && to
                                        ? `Showing ${from}-${to} of ${total} exercises`
                                        : 'Pagination follows active exercise filters.'
                                }
                                onPrevious={() =>
                                    setCurrentPage((page) =>
                                        Math.max(1, page - 1),
                                    )
                                }
                                onNext={() =>
                                    setCurrentPage((page) =>
                                        Math.min(lastPage, page + 1),
                                    )
                                }
                            />
                        </AdminSection>

                        <AdminSection
                            title="Detail Editor"
                            description="Review safety implications, edit catalog metadata, map alternatives, and keep diagnostics linked instead of inline."
                        >
                            <ExerciseEditor
                                exercise={selectedExercise}
                                onChange={setSelectedExercise}
                                onSave={() => void saveExercise()}
                                onHide={() => setHideOpen(true)}
                                onAddAlternative={(payload) =>
                                    void addAlternative(payload)
                                }
                                onMarkUnsafe={(payload) =>
                                    void markUnsafe(payload)
                                }
                                saving={saving}
                            />
                        </AdminSection>
                    </div>
                </AdminShell>
            </RoleGuard>

            <ConfirmActionDialogWithReason
                open={hideOpen}
                onOpenChange={setHideOpen}
                title="Hide exercise from planner"
                description="This keeps the exercise in the catalog for history, but removes it from planner suitability by adding admin visibility tags."
                confirmLabel="Hide exercise"
                confirmVariant="default"
                busy={saving}
                onConfirm={(reason) => void hideExercise(reason)}
            />
        </>
    );
}
