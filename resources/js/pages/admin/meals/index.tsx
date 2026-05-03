import {
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
    EntityDetailDrawer,
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
import { EyeOff, Merge, Pencil, Plus, RefreshCcw, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

type Food = {
    id: number | null;
    name: string;
    brand?: string | null;
    category?: string | null;
    serving_size?: number | string | null;
    serving_unit?: string | null;
    calories?: number | null;
    protein_g?: number | string | null;
    carbs_g?: number | string | null;
    fat_g?: number | string | null;
    fiber_g?: number | string | null;
    sugar_g?: number | string | null;
    sodium_mg?: number | null;
    cholesterol_mg?: number | null;
    allergens?: string[];
    diets_allowed?: string[];
    tags?: string[];
    meal_types?: string[];
    visibility?: 'visible' | 'hidden';
    planner_suitability?: 'suitable' | 'needs_review';
    planner_warnings?: string[];
    duplicate_warning?: string | null;
};

type FoodResponse = {
    data?: Food[];
    total?: number;
    current_page?: number;
    last_page?: number;
    from?: number | null;
    to?: number | null;
    stats?: {
        total: number;
        missing_macros: number;
        missing_allergens: number;
        planner_review: number;
        duplicate_groups: number;
    };
    filters?: {
        categories?: string[];
    };
};

const EMPTY_FOOD: Food = {
    id: null,
    name: '',
    brand: '',
    category: '',
    serving_size: 100,
    serving_unit: 'g',
    calories: null,
    protein_g: null,
    carbs_g: null,
    fat_g: null,
    fiber_g: null,
    sugar_g: null,
    sodium_mg: null,
    cholesterol_mg: null,
    allergens: [],
    diets_allowed: [],
    tags: [],
    meal_types: ['breakfast', 'lunch', 'dinner', 'snack', 'drink'],
    visibility: 'visible',
    planner_suitability: 'needs_review',
    planner_warnings: [],
    duplicate_warning: null,
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

function numberOrNull(value: string) {
    return value.trim() === '' ? null : Number(value);
}

function formatMacro(value?: number | string | null, suffix = 'g') {
    if (value === null || value === undefined || value === '') {
        return '-';
    }

    return `${value}${suffix}`;
}

function buildFoodPayload(food: Food) {
    return {
        name: food.name.trim(),
        brand: food.brand?.trim() || null,
        category: food.category?.trim() || null,
        serving_size:
            food.serving_size === null || food.serving_size === undefined
                ? null
                : Number(food.serving_size),
        serving_unit: food.serving_unit?.trim() || null,
        calories:
            food.calories === null || food.calories === undefined
                ? null
                : Number(food.calories),
        protein_g:
            food.protein_g === null || food.protein_g === undefined
                ? null
                : Number(food.protein_g),
        carbs_g:
            food.carbs_g === null || food.carbs_g === undefined
                ? null
                : Number(food.carbs_g),
        fat_g:
            food.fat_g === null || food.fat_g === undefined
                ? null
                : Number(food.fat_g),
        fiber_g:
            food.fiber_g === null || food.fiber_g === undefined
                ? null
                : Number(food.fiber_g),
        sugar_g:
            food.sugar_g === null || food.sugar_g === undefined
                ? null
                : Number(food.sugar_g),
        sodium_mg:
            food.sodium_mg === null || food.sodium_mg === undefined
                ? null
                : Number(food.sodium_mg),
        cholesterol_mg:
            food.cholesterol_mg === null || food.cholesterol_mg === undefined
                ? null
                : Number(food.cholesterol_mg),
        allergens: food.allergens ?? [],
        diets_allowed: food.diets_allowed ?? [],
        tags: food.tags ?? [],
        meal_types: food.meal_types ?? [],
    };
}

function FoodEditor({
    food,
    onChange,
    onSave,
    onHide,
    onMerge,
    onDelete,
    saving,
}: {
    food: Food | null;
    onChange: (food: Food) => void;
    onSave: () => void;
    onHide: () => void;
    onMerge: () => void;
    onDelete: () => void;
    saving: boolean;
}) {
    if (!food) {
        return (
            <AdminEmpty
                title="Select a catalog item"
                description="Open a food to edit nutrition data, compatibility, allergens, and planner suitability."
            />
        );
    }

    return (
        <div className="space-y-4">
            <AdminPanel
                title={food.id ? food.name : 'Create food'}
                description="Readable catalog editor for planner-safe nutrition metadata. Raw meal logs stay on the separate Meal Logs page."
            >
                <div className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                        <StatusChipSet
                            items={[
                                {
                                    value: food.visibility ?? 'visible',
                                    label:
                                        food.visibility === 'hidden'
                                            ? 'Hidden'
                                            : 'Visible',
                                },
                                {
                                    value:
                                        food.planner_suitability ??
                                        'needs_review',
                                    label:
                                        food.planner_suitability === 'suitable'
                                            ? 'Planner suitable'
                                            : 'Planner review',
                                },
                            ]}
                        />
                    </div>

                    {food.duplicate_warning ? (
                        <AdminNotice tone="warning">
                            {food.duplicate_warning}
                        </AdminNotice>
                    ) : null}

                    {(food.planner_warnings ?? []).length > 0 ? (
                        <AdminNotice tone="warning">
                            Planner warnings:{' '}
                            {(food.planner_warnings ?? []).join(', ')}.
                        </AdminNotice>
                    ) : null}

                    <div className="grid gap-4 md:grid-cols-2">
                        <AdminField label="Name">
                            <AdminInput
                                value={food.name}
                                onChange={(event) =>
                                    onChange({ ...food, name: event.target.value })
                                }
                            />
                        </AdminField>
                        <AdminField label="Category">
                            <AdminInput
                                value={food.category ?? ''}
                                onChange={(event) =>
                                    onChange({
                                        ...food,
                                        category: event.target.value,
                                    })
                                }
                            />
                        </AdminField>
                        <AdminField label="Brand">
                            <AdminInput
                                value={food.brand ?? ''}
                                onChange={(event) =>
                                    onChange({ ...food, brand: event.target.value })
                                }
                            />
                        </AdminField>
                        <div className="grid grid-cols-[minmax(0,1fr)_120px] gap-3">
                            <AdminField label="Serving size">
                                <AdminInput
                                    type="number"
                                    value={food.serving_size ?? ''}
                                    onChange={(event) =>
                                        onChange({
                                            ...food,
                                            serving_size: numberOrNull(
                                                event.target.value,
                                            ),
                                        })
                                    }
                                />
                            </AdminField>
                            <AdminField label="Unit">
                                <AdminInput
                                    value={food.serving_unit ?? ''}
                                    onChange={(event) =>
                                        onChange({
                                            ...food,
                                            serving_unit: event.target.value,
                                        })
                                    }
                                />
                            </AdminField>
                        </div>
                    </div>
                </div>
            </AdminPanel>

            <AdminPanel
                title="Macros and nutrition"
                description="Macro fields stay in a full readable form because planner quality depends on accurate values."
            >
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {[
                        ['Calories', 'calories'],
                        ['Protein (g)', 'protein_g'],
                        ['Carbs (g)', 'carbs_g'],
                        ['Fat (g)', 'fat_g'],
                        ['Fiber (g)', 'fiber_g'],
                        ['Sugar (g)', 'sugar_g'],
                        ['Sodium (mg)', 'sodium_mg'],
                        ['Cholesterol (mg)', 'cholesterol_mg'],
                    ].map(([label, key]) => (
                        <AdminField key={key} label={label}>
                            <AdminInput
                                type="number"
                                value={String(food[key as keyof Food] ?? '')}
                                onChange={(event) =>
                                    onChange({
                                        ...food,
                                        [key]: numberOrNull(event.target.value),
                                    })
                                }
                            />
                        </AdminField>
                    ))}
                </div>
            </AdminPanel>

            <AdminPanel
                title="Safety and compatibility"
                description="These readable lists drive allergy avoidance, diet compatibility, planner suitability, and search filtering."
            >
                <div className="grid gap-4 md:grid-cols-2">
                    <AdminField label="Allergens" helper="Comma-separated, e.g. peanuts, sesame.">
                        <AdminTextarea
                            rows={3}
                            value={listToText(food.allergens)}
                            onChange={(event) =>
                                onChange({
                                    ...food,
                                    allergens: textToList(event.target.value),
                                })
                            }
                        />
                    </AdminField>
                    <AdminField label="Diet compatibility" helper="Comma-separated, e.g. vegan, keto, mediterranean.">
                        <AdminTextarea
                            rows={3}
                            value={listToText(food.diets_allowed)}
                            onChange={(event) =>
                                onChange({
                                    ...food,
                                    diets_allowed: textToList(event.target.value),
                                })
                            }
                        />
                    </AdminField>
                    <AdminField label="Meal types">
                        <AdminInput
                            value={listToText(food.meal_types)}
                            onChange={(event) =>
                                onChange({
                                    ...food,
                                    meal_types: textToList(event.target.value),
                                })
                            }
                        />
                    </AdminField>
                    <AdminField label="Tags">
                        <AdminInput
                            value={listToText(food.tags)}
                            onChange={(event) =>
                                onChange({
                                    ...food,
                                    tags: textToList(event.target.value),
                                })
                            }
                        />
                    </AdminField>
                </div>
            </AdminPanel>

            <AdminStickyBar
                summary={food.id ? `Editing food #${food.id}` : 'Creating food'}
            >
                <Button
                    type="button"
                    onClick={onSave}
                    disabled={saving || food.name.trim() === ''}
                >
                    <Pencil className="h-4 w-4" />
                    {saving ? 'Saving...' : 'Save'}
                </Button>
                {food.id ? (
                    <>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onHide}
                            disabled={saving}
                        >
                            <EyeOff className="h-4 w-4" />
                            Hide
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onMerge}
                            disabled={saving}
                        >
                            <Merge className="h-4 w-4" />
                            Merge duplicate
                        </Button>
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={onDelete}
                            disabled={saving}
                        >
                            <Trash2 className="h-4 w-4" />
                            Delete
                        </Button>
                    </>
                ) : null}
            </AdminStickyBar>
        </div>
    );
}

export default function AdminMealsPage() {
    const [foods, setFoods] = useState<Food[]>([]);
    const [query, setQuery] = useState('');
    const [category, setCategory] = useState('all');
    const [suitability, setSuitability] = useState('all');
    const [categories, setCategories] = useState<string[]>([]);
    const [selectedFood, setSelectedFood] = useState<Food | null>(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [hideOpen, setHideOpen] = useState(false);
    const [mergeOpen, setMergeOpen] = useState(false);
    const [mergeTargetId, setMergeTargetId] = useState('');
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
        missing_macros: 0,
        missing_allergens: 0,
        planner_review: 0,
        duplicate_groups: 0,
    });

    const loadFoods = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const params = new URLSearchParams({
                page: String(currentPage),
                per_page: '25',
            });

            if (query.trim()) {
                params.set('q', query.trim());
            }
            if (category !== 'all') {
                params.set('category', category);
            }
            if (suitability !== 'all') {
                params.set('suitability', suitability);
            }

            const response = await fetch(`/api/admin/foods?${params.toString()}`, {
                headers: { Accept: 'application/json' },
            });

            if (!response.ok) {
                throw new Error('Could not load food catalog.');
            }

            const json = (await response.json()) as FoodResponse;
            const nextFoods = Array.isArray(json.data) ? json.data : [];

            setFoods(nextFoods);
            setCategories(
                Array.isArray(json.filters?.categories)
                    ? json.filters.categories
                    : [],
            );
            setStats({
                total: Number(json.stats?.total ?? 0),
                missing_macros: Number(json.stats?.missing_macros ?? 0),
                missing_allergens: Number(json.stats?.missing_allergens ?? 0),
                planner_review: Number(json.stats?.planner_review ?? 0),
                duplicate_groups: Number(json.stats?.duplicate_groups ?? 0),
            });
            setTotal(Number(json.total ?? 0));
            setCurrentPage(Number(json.current_page ?? 1));
            setLastPage(Number(json.last_page ?? 1));
            setFrom(json.from ?? null);
            setTo(json.to ?? null);
            setSelectedFood((current) => {
                if (current?.id === null) {
                    return current;
                }

                if (current && nextFoods.some((food) => food.id === current.id)) {
                    return nextFoods.find((food) => food.id === current.id) ?? null;
                }

                return nextFoods[0] ?? null;
            });
        } catch (loadError) {
            setFoods([]);
            setSelectedFood(null);
            setError(
                loadError instanceof Error
                    ? loadError.message
                    : 'Could not load food catalog.',
            );
        } finally {
            setLoading(false);
        }
    }, [category, currentPage, query, suitability]);

    useEffect(() => {
        void loadFoods();
    }, [loadFoods]);

    useEffect(() => {
        setCurrentPage(1);
    }, [category, query, suitability]);

    const selectedWarnings = useMemo(
        () => selectedFood?.planner_warnings ?? [],
        [selectedFood],
    );

    async function saveFood() {
        if (!selectedFood) {
            return;
        }

        setSaving(true);
        setError(null);
        setSuccess(null);

        try {
            const response = await fetch(
                selectedFood.id === null
                    ? '/api/admin/foods'
                    : `/api/admin/foods/${selectedFood.id}`,
                jsonRequestInit(
                    selectedFood.id === null ? 'POST' : 'PUT',
                    buildFoodPayload(selectedFood),
                ),
            );

            if (!response.ok) {
                const json = await response.json().catch(() => null);
                throw new Error(
                    typeof json?.message === 'string'
                        ? json.message
                        : 'Could not save food.',
                );
            }

            setSuccess(
                selectedFood.id === null
                    ? 'Food created.'
                    : 'Food updated.',
            );
            setDrawerOpen(false);
            await loadFoods();
        } catch (saveError) {
            setError(
                saveError instanceof Error
                    ? saveError.message
                    : 'Could not save food.',
            );
        } finally {
            setSaving(false);
        }
    }

    async function hideFood(reason: string) {
        if (!selectedFood?.id) {
            return;
        }

        setSaving(true);
        setError(null);
        setSuccess(null);

        try {
            const response = await fetch(
                `/api/admin/foods/${selectedFood.id}/hide`,
                jsonRequestInit('PATCH', { reason }),
            );

            if (!response.ok) {
                throw new Error('Could not hide this food.');
            }

            setHideOpen(false);
            setSuccess('Food hidden from planner/search suitability.');
            await loadFoods();
        } catch (hideError) {
            setError(
                hideError instanceof Error
                    ? hideError.message
                    : 'Could not hide this food.',
            );
        } finally {
            setSaving(false);
        }
    }

    async function deleteFood(reason: string) {
        if (!selectedFood?.id) {
            return;
        }

        setSaving(true);
        setError(null);
        setSuccess(null);

        try {
            const response = await fetch(
                `/api/admin/foods/${selectedFood.id}`,
                jsonRequestInit('DELETE', { reason }),
            );

            if (!response.ok) {
                const json = await response.json().catch(() => null);
                throw new Error(
                    typeof json?.message === 'string'
                        ? json.message
                        : 'Could not delete this food.',
                );
            }

            setDeleteOpen(false);
            setDrawerOpen(false);
            setSuccess('Food deleted.');
            await loadFoods();
        } catch (deleteError) {
            setError(
                deleteError instanceof Error
                    ? deleteError.message
                    : 'Could not delete this food.',
            );
        } finally {
            setSaving(false);
        }
    }

    async function mergeFood(reason: string) {
        if (!selectedFood?.id) {
            return;
        }

        setSaving(true);
        setError(null);
        setSuccess(null);

        try {
            const response = await fetch(
                `/api/admin/foods/${selectedFood.id}/merge`,
                jsonRequestInit('POST', {
                    target_food_id: Number(mergeTargetId),
                    reason,
                }),
            );

            if (!response.ok) {
                const json = await response.json().catch(() => null);
                throw new Error(
                    typeof json?.message === 'string'
                        ? json.message
                        : 'Could not merge this duplicate.',
                );
            }

            setMergeOpen(false);
            setDrawerOpen(false);
            setMergeTargetId('');
            setSuccess('Duplicate merged into the selected target food.');
            await loadFoods();
        } catch (mergeError) {
            setError(
                mergeError instanceof Error
                    ? mergeError.message
                    : 'Could not merge this duplicate.',
            );
        } finally {
            setSaving(false);
        }
    }

    return (
        <>
            <Head title="Admin Food Catalog" />

            <RoleGuard roles={['admin']}>
                <AdminShell
                    title="Meals / Food Catalog"
                    description="Maintain planner-safe catalog nutrition data separately from user meal-log review."
                    actions={
                        <div className="flex flex-wrap gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => void loadFoods()}
                                disabled={loading}
                            >
                                <RefreshCcw className="h-4 w-4" />
                                Refresh
                            </Button>
                            <Button
                                type="button"
                                onClick={() => {
                                    setSelectedFood({ ...EMPTY_FOOD });
                                    setDrawerOpen(true);
                                }}
                            >
                                <Plus className="h-4 w-4" />
                                Create food
                            </Button>
                        </div>
                    }
                >
                    <div className="space-y-6">
                        <AdminStatsGrid>
                            <AdminStatCard
                                label="Catalog foods"
                                value={loading ? '...' : String(stats.total)}
                                tone="accent"
                                helper="Total foods in the catalog."
                            />
                            <AdminStatCard
                                label="Missing macros"
                                value={
                                    loading
                                        ? '...'
                                        : String(stats.missing_macros)
                                }
                                helper="Rows missing calories or core macros."
                            />
                            <AdminStatCard
                                label="Missing allergens"
                                value={
                                    loading
                                        ? '...'
                                        : String(stats.missing_allergens)
                                }
                                helper="Rows without allergen metadata."
                            />
                            <AdminStatCard
                                label="Planner review"
                                value={
                                    loading
                                        ? '...'
                                        : String(stats.planner_review)
                                }
                                helper="Rows flagged by catalog suitability checks."
                            />
                            <AdminStatCard
                                label="Duplicate groups"
                                value={
                                    loading
                                        ? '...'
                                        : String(stats.duplicate_groups)
                                }
                                helper="Normalized name collisions."
                            />
                        </AdminStatsGrid>

                        {error ? <AdminNotice tone="danger">{error}</AdminNotice> : null}
                        {success ? (
                            <AdminNotice tone="success">{success}</AdminNotice>
                        ) : null}

                        <AdminSection
                            title="Catalog Guidance"
                            description="Food Catalog is for reusable nutrition metadata that planner and coach depend on. User Meal Logs are reviewed in their own admin surface."
                        >
                            <div className="grid gap-4 lg:grid-cols-2">
                                <AdminPanel
                                    title="Planner safety"
                                    description="Allergens, diet compatibility, meal types, and anomaly tags determine whether a food is safe for recommendations."
                                >
                                    <div className="dashboard-surface-soft rounded-[20px] px-4 py-4 text-sm leading-6 text-muted-foreground">
                                        Hide questionable foods instead of
                                        deleting referenced catalog rows. Merge
                                        duplicates when a cleaner target exists.
                                    </div>
                                </AdminPanel>
                                <AdminPanel
                                    title="Selected item"
                                    description="Quick suitability summary for the current table selection."
                                >
                                    <div className="dashboard-surface-soft rounded-[20px] px-4 py-4 text-sm leading-6 text-muted-foreground">
                                        {selectedFood ? (
                                            <>
                                                <span className="font-medium text-foreground">
                                                    {selectedFood.name}
                                                </span>{' '}
                                                has{' '}
                                                {selectedWarnings.length === 0
                                                    ? 'no visible planner warnings.'
                                                    : `${selectedWarnings.length} warning${selectedWarnings.length === 1 ? '' : 's'}.`}
                                            </>
                                        ) : (
                                            'Select a catalog row to inspect warnings.'
                                        )}
                                    </div>
                                </AdminPanel>
                            </div>
                        </AdminSection>

                        <AdminSection
                            title="Tabs"
                            description="Catalog editing and user meal-log review stay separate."
                        >
                            <div className="flex flex-wrap gap-2">
                                <Button type="button">Food Catalog</Button>
                                <Button asChild type="button" variant="outline">
                                    <Link href="/admin/meal-logs">
                                        User Meal Logs
                                    </Link>
                                </Button>
                            </div>
                        </AdminSection>

                        <AdminSection
                            title="Toolbar"
                            description={
                                from && to
                                    ? `Showing ${from}-${to} of ${total} foods.`
                                    : 'Filter the reusable food catalog.'
                            }
                        >
                            <AdminToolbar>
                                <AdminToolbarGroup grow>
                                    <AdminField label="Search" className="xl:flex-1">
                                        <AdminInput
                                            value={query}
                                            onChange={(event) =>
                                                setQuery(event.target.value)
                                            }
                                            placeholder="Search name, category, or serving unit"
                                        />
                                    </AdminField>
                                    <AdminField label="Category" className="sm:w-56">
                                        <AdminNativeSelect
                                            value={category}
                                            onChange={(event) =>
                                                setCategory(event.target.value)
                                            }
                                        >
                                            <option value="all">
                                                All categories
                                            </option>
                                            {categories.map((option) => (
                                                <option
                                                    key={option}
                                                    value={option}
                                                >
                                                    {option}
                                                </option>
                                            ))}
                                        </AdminNativeSelect>
                                    </AdminField>
                                    <AdminField
                                        label="Planner suitability"
                                        className="sm:w-56"
                                    >
                                        <AdminNativeSelect
                                            value={suitability}
                                            onChange={(event) =>
                                                setSuitability(event.target.value)
                                            }
                                        >
                                            <option value="all">All</option>
                                            <option value="suitable">
                                                Suitable
                                            </option>
                                            <option value="needs_review">
                                                Needs review
                                            </option>
                                        </AdminNativeSelect>
                                    </AdminField>
                                </AdminToolbarGroup>
                            </AdminToolbar>
                        </AdminSection>

                        <AdminSection
                            title="Food Catalog"
                            description="Compact table for scanning; open the drawer for readable macro and safety editing."
                        >
                            {loading && foods.length === 0 ? (
                                <AdminEmpty
                                    title="Loading food catalog"
                                    description="Fetching catalog foods and planner suitability metadata."
                                />
                            ) : (
                                <AdminScrollArea maxHeightClassName="max-h-[68vh]">
                                    <AdminDataTable tableClassName="min-w-[1120px]">
                                        <ProductTableHead>
                                            <tr>
                                                <ProductTableHeaderCell>
                                                    Food
                                                </ProductTableHeaderCell>
                                                <ProductTableHeaderCell>
                                                    Serving
                                                </ProductTableHeaderCell>
                                                <ProductTableHeaderCell>
                                                    Macros
                                                </ProductTableHeaderCell>
                                                <ProductTableHeaderCell>
                                                    Allergens
                                                </ProductTableHeaderCell>
                                                <ProductTableHeaderCell>
                                                    Diet compatibility
                                                </ProductTableHeaderCell>
                                                <ProductTableHeaderCell>
                                                    Visibility
                                                </ProductTableHeaderCell>
                                                <ProductTableHeaderCell>
                                                    Planner
                                                </ProductTableHeaderCell>
                                                <ProductTableHeaderCell className="w-36">
                                                    Actions
                                                </ProductTableHeaderCell>
                                            </tr>
                                        </ProductTableHead>
                                        <ProductTableBody>
                                            {foods.map((food) => (
                                                <ProductTableRow
                                                    key={food.id}
                                                    interactive
                                                    className={
                                                        food.id ===
                                                        selectedFood?.id
                                                            ? 'bg-primary/5'
                                                            : undefined
                                                    }
                                                >
                                                    <ProductTableCell>
                                                        <button
                                                            type="button"
                                                            className="w-full text-left"
                                                            onClick={() => {
                                                                setSelectedFood(
                                                                    food,
                                                                );
                                                                setDrawerOpen(
                                                                    true,
                                                                );
                                                            }}
                                                        >
                                                            <div className="font-medium text-foreground">
                                                                {food.name}
                                                            </div>
                                                            <div className="text-xs text-muted-foreground">
                                                                {food.category ||
                                                                    'No category'}
                                                            </div>
                                                            {food.duplicate_warning ? (
                                                                <div className="mt-1 text-xs font-medium text-amber-700">
                                                                    Duplicate
                                                                    warning
                                                                </div>
                                                            ) : null}
                                                        </button>
                                                    </ProductTableCell>
                                                    <ProductTableCell>
                                                        <div className="text-sm text-foreground">
                                                            {food.serving_size ??
                                                                '-'}{' '}
                                                            {food.serving_unit ||
                                                                'unit missing'}
                                                        </div>
                                                    </ProductTableCell>
                                                    <ProductTableCell>
                                                        <div className="space-y-1 text-xs text-muted-foreground">
                                                            <div className="font-medium text-foreground">
                                                                {formatMacro(
                                                                    food.calories,
                                                                    ' kcal',
                                                                )}
                                                            </div>
                                                            <div>
                                                                P{' '}
                                                                {formatMacro(
                                                                    food.protein_g,
                                                                )}{' '}
                                                                · C{' '}
                                                                {formatMacro(
                                                                    food.carbs_g,
                                                                )}{' '}
                                                                · F{' '}
                                                                {formatMacro(
                                                                    food.fat_g,
                                                                )}
                                                            </div>
                                                        </div>
                                                    </ProductTableCell>
                                                    <ProductTableCell>
                                                        <div className="flex max-w-48 flex-wrap gap-1">
                                                            {(food.allergens ?? [])
                                                                .slice(0, 3)
                                                                .map((item) => (
                                                                    <Badge
                                                                        key={item}
                                                                        variant="outline"
                                                                    >
                                                                        {item}
                                                                    </Badge>
                                                                ))}
                                                            {(food.allergens ?? [])
                                                                .length === 0 ? (
                                                                <span className="text-xs text-muted-foreground">
                                                                    Missing
                                                                </span>
                                                            ) : null}
                                                        </div>
                                                    </ProductTableCell>
                                                    <ProductTableCell>
                                                        <div className="flex max-w-56 flex-wrap gap-1">
                                                            {(food.diets_allowed ??
                                                                [])
                                                                .slice(0, 3)
                                                                .map((item) => (
                                                                    <Badge
                                                                        key={item}
                                                                        variant="secondary"
                                                                    >
                                                                        {item}
                                                                    </Badge>
                                                                ))}
                                                            {(food.diets_allowed ??
                                                                []).length ===
                                                            0 ? (
                                                                <span className="text-xs text-muted-foreground">
                                                                    Not scoped
                                                                </span>
                                                            ) : null}
                                                        </div>
                                                    </ProductTableCell>
                                                    <ProductTableCell>
                                                        <StatusChipSet
                                                            items={[
                                                                {
                                                                    value:
                                                                        food.visibility ??
                                                                        'visible',
                                                                    label:
                                                                        food.visibility ===
                                                                        'hidden'
                                                                            ? 'Hidden'
                                                                            : 'Visible',
                                                                },
                                                            ]}
                                                        />
                                                    </ProductTableCell>
                                                    <ProductTableCell>
                                                        <div className="space-y-1">
                                                            <StatusChipSet
                                                                items={[
                                                                    {
                                                                        value:
                                                                            food.planner_suitability ??
                                                                            'needs_review',
                                                                        label:
                                                                            food.planner_suitability ===
                                                                            'suitable'
                                                                                ? 'Suitable'
                                                                                : 'Needs review',
                                                                    },
                                                                ]}
                                                            />
                                                            <div className="line-clamp-1 text-xs text-muted-foreground">
                                                                {(food.planner_warnings ??
                                                                    [])
                                                                    .slice(0, 2)
                                                                    .join(', ') ||
                                                                    'No warnings'}
                                                            </div>
                                                        </div>
                                                    </ProductTableCell>
                                                    <ProductTableCell>
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => {
                                                                setSelectedFood(
                                                                    food,
                                                                );
                                                                setDrawerOpen(
                                                                    true,
                                                                );
                                                            }}
                                                        >
                                                            Edit
                                                        </Button>
                                                    </ProductTableCell>
                                                </ProductTableRow>
                                            ))}

                                            {!loading && foods.length === 0 ? (
                                                <ProductTableEmptyRow
                                                    colSpan={8}
                                                    title="No foods found"
                                                    description="Adjust filters or create a new catalog food."
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
                                        ? `Showing ${from}-${to} of ${total} foods`
                                        : 'Pagination follows active catalog filters.'
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
                    </div>
                </AdminShell>
            </RoleGuard>

            <EntityDetailDrawer
                open={drawerOpen}
                onOpenChange={setDrawerOpen}
                title={selectedFood?.name || 'Food editor'}
                description="Edit reusable food catalog data."
            >
                <FoodEditor
                    food={selectedFood}
                    onChange={setSelectedFood}
                    onSave={() => void saveFood()}
                    onHide={() => setHideOpen(true)}
                    onMerge={() => setMergeOpen(true)}
                    onDelete={() => setDeleteOpen(true)}
                    saving={saving}
                />
            </EntityDetailDrawer>

            <ConfirmActionDialogWithReason
                open={hideOpen}
                onOpenChange={setHideOpen}
                title="Hide food from planner suitability"
                description="This adds admin visibility tags while keeping referenced logs and plans intact."
                confirmLabel="Hide food"
                confirmVariant="default"
                busy={saving}
                onConfirm={(reason) => void hideFood(reason)}
            />

            <ConfirmActionDialogWithReason
                open={deleteOpen}
                onOpenChange={setDeleteOpen}
                title="Delete food"
                description="Deletion only works when no logs or plans reference this food. Merge duplicates first when needed."
                confirmLabel="Delete food"
                busy={saving}
                onConfirm={(reason) => void deleteFood(reason)}
            />

            <ConfirmActionDialogWithReason
                open={mergeOpen}
                onOpenChange={setMergeOpen}
                title="Merge duplicate food"
                description={
                    <div className="space-y-3">
                        <p>
                            Move logs and plans from this food into the target
                            food, then remove this duplicate.
                        </p>
                        <AdminField label="Target food ID">
                            <AdminInput
                                value={mergeTargetId}
                                onChange={(event) =>
                                    setMergeTargetId(event.target.value)
                                }
                                placeholder="Enter the catalog ID to keep"
                            />
                        </AdminField>
                    </div>
                }
                confirmLabel="Merge duplicate"
                confirmVariant="default"
                busy={saving}
                onConfirm={(reason) => void mergeFood(reason)}
            />
        </>
    );
}
