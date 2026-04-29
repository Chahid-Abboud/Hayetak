import {
    AdminDataTable,
    AdminEmpty,
    AdminInput,
    AdminNotice,
    AdminPanel,
    AdminStickyBar,
} from '@/components/admin/admin-ui';
import {
    ActivityTimeline,
    AdminFilterToolbar,
    AdminSplitView,
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
import { Button } from '@/components/ui/button';
import { jsonRequestInit } from '@/lib/http';
import { Head } from '@inertiajs/react';
import { Pencil, Plus, RefreshCcw, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

type Food = {
    id: number | null;
    name: string;
    category?: string | null;
    calories?: number | null;
    protein_g?: number | null;
    carbs_g?: number | null;
    fat_g?: number | null;
};

type MealEntry = {
    id: number;
    user_id: number;
    food_id: number;
    meal_type: string;
    servings: string;
    eaten_at: string;
    user?: {
        id: number;
        email: string;
        first_name?: string | null;
        last_name?: string | null;
    } | null;
    food?: { id: number; name: string } | null;
};

type PaginatedResponse<T> = {
    data?: T[];
    total?: number;
    current_page?: number;
    last_page?: number;
    from?: number | null;
    to?: number | null;
};

const EMPTY_FOOD: Food = {
    id: null,
    name: '',
    category: '',
    calories: null,
    protein_g: null,
    carbs_g: null,
    fat_g: null,
};

function personName(entry: MealEntry) {
    return (
        [entry.user?.first_name, entry.user?.last_name]
            .filter(Boolean)
            .join(' ') ||
        entry.user?.email ||
        `User #${entry.user_id}`
    );
}

function formatDateTime(value?: string | null) {
    if (!value) {
        return 'Not available';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    }).format(date);
}

function EntryDetailPanel({
    entry,
    onEntryChange,
    onSave,
    onDelete,
    saving,
}: {
    entry: MealEntry | null;
    onEntryChange: (entry: MealEntry) => void;
    onSave: () => void;
    onDelete: () => void;
    saving: boolean;
}) {
    if (!entry) {
        return (
            <AdminEmpty
                title="Select a meal log"
                description="Open a recent entry to correct meal type, servings, or eaten time."
            />
        );
    }

    return (
        <AdminPanel
            title={entry.food?.name || `Food #${entry.food_id}`}
            description="Editable meal-log detail for quick admin corrections."
        >
            <div className="space-y-4">
                <StatusChipSet
                    items={[
                        { value: entry.meal_type, label: entry.meal_type },
                        { value: 'default', label: personName(entry) },
                    ]}
                />

                <Field
                    label="Meal type"
                    value={entry.meal_type}
                    onChange={(value) =>
                        onEntryChange({ ...entry, meal_type: value })
                    }
                />
                <Field
                    label="Servings"
                    value={entry.servings}
                    onChange={(value) =>
                        onEntryChange({ ...entry, servings: value })
                    }
                />
                <Field
                    label="Eaten at"
                    value={entry.eaten_at}
                    onChange={(value) =>
                        onEntryChange({ ...entry, eaten_at: value })
                    }
                />

                <AdminStickyBar
                    summary={`User #${entry.user_id} • ${formatDateTime(entry.eaten_at)}`}
                >
                    <Button type="button" onClick={onSave} disabled={saving}>
                        <Pencil className="h-4 w-4" />
                        {saving ? 'Saving...' : 'Save entry'}
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
                </AdminStickyBar>
            </div>
        </AdminPanel>
    );
}

export default function AdminMealsPage() {
    const [foods, setFoods] = useState<Food[]>([]);
    const [entries, setEntries] = useState<MealEntry[]>([]);
    const [foodQ, setFoodQ] = useState('');
    const [entrySearch, setEntrySearch] = useState('');
    const [mealTypeFilter, setMealTypeFilter] = useState('all');
    const [selectedFood, setSelectedFood] = useState<Food | null>(null);
    const [selectedEntryId, setSelectedEntryId] = useState<number | null>(null);
    const [editingEntry, setEditingEntry] = useState<MealEntry | null>(null);
    const [entryDrawerOpen, setEntryDrawerOpen] = useState(false);
    const [foodDeleteOpen, setFoodDeleteOpen] = useState(false);
    const [entryDeleteOpen, setEntryDeleteOpen] = useState(false);
    const [loadingFoods, setLoadingFoods] = useState(true);
    const [loadingEntries, setLoadingEntries] = useState(true);
    const [savingFood, setSavingFood] = useState(false);
    const [savingEntry, setSavingEntry] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [entryPage, setEntryPage] = useState(1);
    const [entryLastPage, setEntryLastPage] = useState(1);
    const [entryFrom, setEntryFrom] = useState<number | null>(null);
    const [entryTo, setEntryTo] = useState<number | null>(null);
    const [entryTotal, setEntryTotal] = useState(0);
    const [workspaceTab, setWorkspaceTab] = useState<'catalog' | 'logs'>(
        'catalog',
    );

    const loadFoods = useCallback(async () => {
        setLoadingFoods(true);
        setError(null);

        try {
            const res = await fetch(
                `/api/admin/foods?per_page=20&q=${encodeURIComponent(foodQ)}`,
                { headers: { Accept: 'application/json' } },
            );

            if (!res.ok) {
                throw new Error('Could not load the food catalog.');
            }

            const json = (await res.json()) as PaginatedResponse<Food>;
            const nextFoods = Array.isArray(json?.data) ? json.data : [];
            setFoods(nextFoods);
            setSelectedFood((current) =>
                current && current.id === null
                    ? current
                    : current &&
                        nextFoods.some((food) => food.id === current.id)
                      ? (nextFoods.find((food) => food.id === current.id) ??
                        null)
                      : (nextFoods[0] ?? null),
            );
        } catch (loadError) {
            setFoods([]);
            setSelectedFood(null);
            setError(
                loadError instanceof Error
                    ? loadError.message
                    : 'Could not load the food catalog.',
            );
        } finally {
            setLoadingFoods(false);
        }
    }, [foodQ]);

    const loadEntries = useCallback(async () => {
        setLoadingEntries(true);
        setError(null);

        try {
            const params = new URLSearchParams({
                per_page: '20',
                page: String(entryPage),
            });

            if (entrySearch.trim()) {
                params.set('search', entrySearch.trim());
            }
            if (mealTypeFilter !== 'all') {
                params.set('meal_type', mealTypeFilter);
            }

            const res = await fetch(
                `/api/admin/meal-entries?${params.toString()}`,
                {
                    headers: { Accept: 'application/json' },
                },
            );

            if (!res.ok) {
                throw new Error('Could not load recent meal entries.');
            }

            const json = (await res.json()) as PaginatedResponse<MealEntry>;
            const rows = Array.isArray(json?.data) ? json.data : [];

            setEntries(rows);
            setEntryTotal(Number(json?.total ?? 0));
            setEntryPage(Number(json?.current_page ?? 1));
            setEntryLastPage(Number(json?.last_page ?? 1));
            setEntryFrom(json?.from ?? null);
            setEntryTo(json?.to ?? null);
        } catch (loadError) {
            setEntries([]);
            setError(
                loadError instanceof Error
                    ? loadError.message
                    : 'Could not load recent meal entries.',
            );
        } finally {
            setLoadingEntries(false);
        }
    }, [entryPage, entrySearch, mealTypeFilter]);

    useEffect(() => {
        void loadFoods();
    }, [loadFoods]);

    useEffect(() => {
        void loadEntries();
    }, [loadEntries]);

    useEffect(() => {
        setEntryPage(1);
    }, [entrySearch, mealTypeFilter]);

    useEffect(() => {
        if (entries.length === 0) {
            setSelectedEntryId(null);
            setEditingEntry(null);
            return;
        }

        if (
            !selectedEntryId ||
            !entries.some((entry) => entry.id === selectedEntryId)
        ) {
            setSelectedEntryId(entries[0].id);
            setEditingEntry(entries[0]);
            return;
        }

        const current =
            entries.find((entry) => entry.id === selectedEntryId) ?? null;
        setEditingEntry(current);
    }, [entries, selectedEntryId]);

    const selectedEntry = useMemo(
        () => entries.find((entry) => entry.id === selectedEntryId) ?? null,
        [entries, selectedEntryId],
    );

    useEffect(() => {
        if (selectedEntry) {
            setEditingEntry(selectedEntry);
        }
    }, [selectedEntry]);

    const totalCalories = useMemo(
        () => foods.reduce((sum, food) => sum + Number(food.calories ?? 0), 0),
        [foods],
    );
    const missingCategoryCount = useMemo(
        () => foods.filter((food) => !food.category).length,
        [foods],
    );
    const missingMacroCount = useMemo(
        () =>
            foods.filter(
                (food) =>
                    food.protein_g == null ||
                    food.carbs_g == null ||
                    food.fat_g == null,
            ).length,
        [foods],
    );

    async function saveFood() {
        if (!selectedFood) return;

        setSavingFood(true);
        setError(null);
        setSuccess(null);

        try {
            const payload = {
                name: selectedFood.name,
                category: selectedFood.category || null,
                calories:
                    selectedFood.calories == null
                        ? null
                        : Number(selectedFood.calories),
                protein_g:
                    selectedFood.protein_g == null
                        ? null
                        : Number(selectedFood.protein_g),
                carbs_g:
                    selectedFood.carbs_g == null
                        ? null
                        : Number(selectedFood.carbs_g),
                fat_g:
                    selectedFood.fat_g == null
                        ? null
                        : Number(selectedFood.fat_g),
            };

            const response = await fetch(
                selectedFood.id === null
                    ? '/api/admin/foods'
                    : `/api/admin/foods/${selectedFood.id}`,
                jsonRequestInit(
                    selectedFood.id === null ? 'POST' : 'PUT',
                    payload,
                ),
            );

            if (!response.ok) {
                const json = await response.json().catch(() => null);
                throw new Error(
                    typeof json?.message === 'string'
                        ? json.message
                        : 'Could not save this food.',
                );
            }

            setSuccess(
                selectedFood.id === null
                    ? 'Food added to the catalog.'
                    : 'Food updated successfully.',
            );
            await loadFoods();
        } catch (saveError) {
            setError(
                saveError instanceof Error
                    ? saveError.message
                    : 'Could not save this food.',
            );
        } finally {
            setSavingFood(false);
        }
    }

    async function deleteFood(reason: string) {
        if (!selectedFood?.id) return;

        setSavingFood(true);
        setError(null);
        setSuccess(null);

        try {
            const response = await fetch(
                `/api/admin/foods/${selectedFood.id}`,
                jsonRequestInit('DELETE', { reason }),
            );

            if (!response.ok) {
                throw new Error('Could not delete this food.');
            }

            setFoodDeleteOpen(false);
            setSuccess('Food removed from the catalog.');
            await loadFoods();
        } catch (deleteError) {
            setError(
                deleteError instanceof Error
                    ? deleteError.message
                    : 'Could not delete this food.',
            );
        } finally {
            setSavingFood(false);
        }
    }

    async function saveEntry() {
        if (!editingEntry) return;

        setSavingEntry(true);
        setError(null);
        setSuccess(null);

        try {
            const response = await fetch(
                `/api/admin/meal-entries/${editingEntry.id}`,
                jsonRequestInit('PUT', {
                    meal_type: editingEntry.meal_type,
                    servings: Number(editingEntry.servings),
                    eaten_at: editingEntry.eaten_at,
                }),
            );

            if (!response.ok) {
                const json = await response.json().catch(() => null);
                throw new Error(
                    typeof json?.message === 'string'
                        ? json.message
                        : 'Could not update this meal entry.',
                );
            }

            setSuccess('Meal entry updated successfully.');
            await loadEntries();
        } catch (saveError) {
            setError(
                saveError instanceof Error
                    ? saveError.message
                    : 'Could not update this meal entry.',
            );
        } finally {
            setSavingEntry(false);
        }
    }

    async function deleteEntry(reason: string) {
        if (!selectedEntry) return;

        setSavingEntry(true);
        setError(null);
        setSuccess(null);

        try {
            const response = await fetch(
                `/api/admin/meal-entries/${selectedEntry.id}`,
                jsonRequestInit('DELETE', { reason }),
            );

            if (!response.ok) {
                throw new Error('Could not delete this meal entry.');
            }

            setEntryDeleteOpen(false);
            setEntryDrawerOpen(false);
            setSuccess('Meal entry deleted successfully.');
            await loadEntries();
        } catch (deleteError) {
            setError(
                deleteError instanceof Error
                    ? deleteError.message
                    : 'Could not delete this meal entry.',
            );
        } finally {
            setSavingEntry(false);
        }
    }

    return (
        <>
            <Head title="Admin Meals" />

            <RoleGuard roles={['admin']}>
                <AdminShell
                    title="Meals management"
                    description="Keep catalog nutrition data trustworthy, then correct the recent meal logs that affect planner quality and coach safety."
                    actions={
                        <div className="flex flex-wrap items-center gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    void loadFoods();
                                    void loadEntries();
                                }}
                                disabled={loadingFoods || loadingEntries}
                            >
                                <RefreshCcw className="h-4 w-4" />
                                Refresh
                            </Button>
                            <Button
                                type="button"
                                onClick={() => {
                                    setSelectedFood({ ...EMPTY_FOOD });
                                    setSuccess(null);
                                    setError(null);
                                }}
                            >
                                <Plus className="h-4 w-4" />
                                Add food
                            </Button>
                        </div>
                    }
                >
                    <div className="space-y-6">
                        <AdminStatsGrid>
                            <AdminStatCard
                                label="Visible foods"
                                value={
                                    loadingFoods ? '...' : String(foods.length)
                                }
                                tone="accent"
                                helper="Current food search applied."
                            />
                            <AdminStatCard
                                label="Foods missing category"
                                value={
                                    loadingFoods
                                        ? '...'
                                        : String(missingCategoryCount)
                                }
                                helper="Catalog entries that need better discovery metadata."
                            />
                            <AdminStatCard
                                label="Foods missing macros"
                                value={
                                    loadingFoods
                                        ? '...'
                                        : String(missingMacroCount)
                                }
                                helper="Entries that weaken planner and coach trust."
                            />
                            <AdminStatCard
                                label="Visible calories total"
                                value={
                                    loadingFoods
                                        ? '...'
                                        : `${Math.round(totalCalories)} kcal`
                                }
                                helper="Quick sense-check for catalog completeness."
                            />
                        </AdminStatsGrid>

                        <AdminSection
                            title="Filter & action toolbar"
                            description="Switch between catalog stewardship and meal-log corrections without mixing both workflows in one crowded pane."
                        >
                            <div className="flex flex-wrap items-center gap-2">
                                <Button
                                    type="button"
                                    variant={
                                        workspaceTab === 'catalog'
                                            ? 'default'
                                            : 'outline'
                                    }
                                    onClick={() => setWorkspaceTab('catalog')}
                                >
                                    Food catalog
                                </Button>
                                <Button
                                    type="button"
                                    variant={
                                        workspaceTab === 'logs'
                                            ? 'default'
                                            : 'outline'
                                    }
                                    onClick={() => setWorkspaceTab('logs')}
                                >
                                    Meal logs
                                </Button>
                            </div>
                        </AdminSection>

                        {error ? (
                            <AdminNotice tone="danger">{error}</AdminNotice>
                        ) : null}
                        {success ? (
                            <AdminNotice tone="success">{success}</AdminNotice>
                        ) : null}

                        {workspaceTab === 'catalog' ? (
                            <AdminSection
                                title="Food catalog workspace"
                                description="Search the food catalog, review macro completeness, and update entries without leaving the admin flow."
                            >
                                <AdminFilterToolbar
                                    search={foodQ}
                                    onSearchChange={setFoodQ}
                                    searchPlaceholder="Search foods by name"
                                />

                                <AdminSplitView
                                    list={
                                        loadingFoods ? (
                                            <AdminEmpty
                                                title="Loading foods"
                                                description="Fetching the latest food catalog."
                                            />
                                        ) : (
                                            <AdminDataTable>
                                                <ProductTableHead>
                                                    <tr>
                                                        <ProductTableHeaderCell>
                                                            Food
                                                        </ProductTableHeaderCell>
                                                        <ProductTableHeaderCell>
                                                            Category
                                                        </ProductTableHeaderCell>
                                                        <ProductTableHeaderCell>
                                                            Macros
                                                        </ProductTableHeaderCell>
                                                    </tr>
                                                </ProductTableHead>
                                                <ProductTableBody>
                                                    {foods.map((food) => (
                                                        <ProductTableRow
                                                            key={
                                                                food.id ??
                                                                food.name
                                                            }
                                                            interactive
                                                            className={
                                                                food.id ===
                                                                selectedFood?.id
                                                                    ? 'bg-primary/6'
                                                                    : undefined
                                                            }
                                                        >
                                                            <ProductTableCell>
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        setSelectedFood(
                                                                            {
                                                                                ...food,
                                                                            },
                                                                        )
                                                                    }
                                                                    className="w-full text-left font-medium"
                                                                >
                                                                    {food.name}
                                                                </button>
                                                            </ProductTableCell>
                                                            <ProductTableCell className="text-sm text-muted-foreground">
                                                                {food.category ||
                                                                    'Uncategorized'}
                                                            </ProductTableCell>
                                                            <ProductTableCell className="text-sm text-muted-foreground">
                                                                {food.calories ??
                                                                    0}{' '}
                                                                kcal • P{' '}
                                                                {food.protein_g ??
                                                                    0}{' '}
                                                                • C{' '}
                                                                {food.carbs_g ??
                                                                    0}{' '}
                                                                • F{' '}
                                                                {food.fat_g ??
                                                                    0}
                                                            </ProductTableCell>
                                                        </ProductTableRow>
                                                    ))}
                                                    {foods.length === 0 ? (
                                                        <ProductTableEmptyRow
                                                            colSpan={3}
                                                            title="No foods found"
                                                            description="Try another search term or add a new food to the catalog."
                                                        />
                                                    ) : null}
                                                </ProductTableBody>
                                            </AdminDataTable>
                                        )
                                    }
                                    detail={
                                        !selectedFood ? (
                                            <AdminEmpty
                                                title="Select or create a food"
                                                description="Choose a row from the catalog or add a new food entry."
                                            />
                                        ) : (
                                            <AdminPanel
                                                title={
                                                    selectedFood.id === null
                                                        ? 'Create food'
                                                        : 'Edit food'
                                                }
                                                description="Keep catalog entries clean so planner and tracking experiences stay trustworthy."
                                            >
                                                <div className="space-y-4">
                                                    <Field
                                                        label="Food name"
                                                        value={
                                                            selectedFood.name
                                                        }
                                                        onChange={(value) =>
                                                            setSelectedFood({
                                                                ...selectedFood,
                                                                name: value,
                                                            })
                                                        }
                                                    />
                                                    <Field
                                                        label="Category"
                                                        value={
                                                            selectedFood.category ??
                                                            ''
                                                        }
                                                        onChange={(value) =>
                                                            setSelectedFood({
                                                                ...selectedFood,
                                                                category: value,
                                                            })
                                                        }
                                                    />
                                                    <div className="grid gap-4 sm:grid-cols-2">
                                                        <Field
                                                            label="Calories"
                                                            value={
                                                                selectedFood.calories ==
                                                                null
                                                                    ? ''
                                                                    : String(
                                                                          selectedFood.calories,
                                                                      )
                                                            }
                                                            onChange={(value) =>
                                                                setSelectedFood(
                                                                    {
                                                                        ...selectedFood,
                                                                        calories:
                                                                            value ===
                                                                            ''
                                                                                ? null
                                                                                : Number(
                                                                                      value,
                                                                                  ),
                                                                    },
                                                                )
                                                            }
                                                        />
                                                        <Field
                                                            label="Protein (g)"
                                                            value={
                                                                selectedFood.protein_g ==
                                                                null
                                                                    ? ''
                                                                    : String(
                                                                          selectedFood.protein_g,
                                                                      )
                                                            }
                                                            onChange={(value) =>
                                                                setSelectedFood(
                                                                    {
                                                                        ...selectedFood,
                                                                        protein_g:
                                                                            value ===
                                                                            ''
                                                                                ? null
                                                                                : Number(
                                                                                      value,
                                                                                  ),
                                                                    },
                                                                )
                                                            }
                                                        />
                                                        <Field
                                                            label="Carbs (g)"
                                                            value={
                                                                selectedFood.carbs_g ==
                                                                null
                                                                    ? ''
                                                                    : String(
                                                                          selectedFood.carbs_g,
                                                                      )
                                                            }
                                                            onChange={(value) =>
                                                                setSelectedFood(
                                                                    {
                                                                        ...selectedFood,
                                                                        carbs_g:
                                                                            value ===
                                                                            ''
                                                                                ? null
                                                                                : Number(
                                                                                      value,
                                                                                  ),
                                                                    },
                                                                )
                                                            }
                                                        />
                                                        <Field
                                                            label="Fat (g)"
                                                            value={
                                                                selectedFood.fat_g ==
                                                                null
                                                                    ? ''
                                                                    : String(
                                                                          selectedFood.fat_g,
                                                                      )
                                                            }
                                                            onChange={(value) =>
                                                                setSelectedFood(
                                                                    {
                                                                        ...selectedFood,
                                                                        fat_g:
                                                                            value ===
                                                                            ''
                                                                                ? null
                                                                                : Number(
                                                                                      value,
                                                                                  ),
                                                                    },
                                                                )
                                                            }
                                                        />
                                                    </div>
                                                    <AdminStickyBar
                                                        summary={
                                                            selectedFood.id
                                                                ? `Editing food #${selectedFood.id}`
                                                                : 'Creating a new catalog food'
                                                        }
                                                    >
                                                        <Button
                                                            type="button"
                                                            onClick={() =>
                                                                void saveFood()
                                                            }
                                                            disabled={
                                                                savingFood ||
                                                                !selectedFood.name
                                                            }
                                                        >
                                                            {savingFood
                                                                ? 'Saving...'
                                                                : 'Save food'}
                                                        </Button>
                                                        {selectedFood.id ? (
                                                            <Button
                                                                type="button"
                                                                variant="destructive"
                                                                onClick={() =>
                                                                    setFoodDeleteOpen(
                                                                        true,
                                                                    )
                                                                }
                                                                disabled={
                                                                    savingFood
                                                                }
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                                Delete
                                                            </Button>
                                                        ) : null}
                                                    </AdminStickyBar>
                                                </div>
                                            </AdminPanel>
                                        )
                                    }
                                />
                            </AdminSection>
                        ) : null}

                        {workspaceTab === 'logs' ? (
                            <AdminSection
                                title="Meal logs workspace"
                                description={
                                    entryFrom && entryTo
                                        ? `Showing ${entryFrom}-${entryTo} of ${entryTotal} recent logs. Open a row to edit or delete it.`
                                        : 'Open a row to edit or delete it.'
                                }
                            >
                                <AdminFilterToolbar
                                    search={entrySearch}
                                    onSearchChange={setEntrySearch}
                                    searchPlaceholder="Search user or food name"
                                    filters={[
                                        {
                                            label: 'Meal type',
                                            value: mealTypeFilter,
                                            onChange: setMealTypeFilter,
                                            options: [
                                                {
                                                    value: 'all',
                                                    label: 'All meals',
                                                },
                                                {
                                                    value: 'breakfast',
                                                    label: 'Breakfast',
                                                },
                                                {
                                                    value: 'lunch',
                                                    label: 'Lunch',
                                                },
                                                {
                                                    value: 'dinner',
                                                    label: 'Dinner',
                                                },
                                                {
                                                    value: 'snack',
                                                    label: 'Snack',
                                                },
                                                {
                                                    value: 'drink',
                                                    label: 'Drink',
                                                },
                                            ],
                                        },
                                    ]}
                                />

                                <AdminSplitView
                                    list={
                                        <div className="space-y-4">
                                            {loadingEntries ? (
                                                <AdminEmpty
                                                    title="Loading meal logs"
                                                    description="Fetching the latest tracked entries."
                                                />
                                            ) : (
                                                <ActivityTimeline
                                                    items={entries.map(
                                                        (entry) => ({
                                                            id: entry.id,
                                                            title:
                                                                entry.food
                                                                    ?.name ||
                                                                `Food #${entry.food_id}`,
                                                            description:
                                                                personName(
                                                                    entry,
                                                                ),
                                                            meta: `${entry.meal_type} • ${entry.servings} serving(s)`,
                                                            timestamp:
                                                                formatDateTime(
                                                                    entry.eaten_at,
                                                                ),
                                                            tone: 'success',
                                                            chips: [
                                                                {
                                                                    value: entry.meal_type,
                                                                    label: entry.meal_type,
                                                                },
                                                            ],
                                                        }),
                                                    )}
                                                    selectedId={selectedEntryId}
                                                    onSelect={(id) =>
                                                        setSelectedEntryId(
                                                            Number(id),
                                                        )
                                                    }
                                                    emptyTitle="No recent meal logs"
                                                    emptyDescription="Meal activity will appear here once users continue tracking."
                                                />
                                            )}

                                            <AdminStickyBar
                                                summary={
                                                    entryFrom && entryTo
                                                        ? `Showing ${entryFrom}-${entryTo} of ${entryTotal} logs`
                                                        : 'Pagination stays aligned with the active meal filters.'
                                                }
                                            >
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    onClick={() =>
                                                        setEntryPage((page) =>
                                                            Math.max(
                                                                1,
                                                                page - 1,
                                                            ),
                                                        )
                                                    }
                                                    disabled={
                                                        loadingEntries ||
                                                        entryPage <= 1
                                                    }
                                                >
                                                    Previous
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    onClick={() =>
                                                        setEntryPage((page) =>
                                                            Math.min(
                                                                entryLastPage,
                                                                page + 1,
                                                            ),
                                                        )
                                                    }
                                                    disabled={
                                                        loadingEntries ||
                                                        entryPage >=
                                                            entryLastPage
                                                    }
                                                >
                                                    Next
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    onClick={() =>
                                                        setEntryDrawerOpen(true)
                                                    }
                                                    disabled={!selectedEntry}
                                                    className="xl:hidden"
                                                >
                                                    Inspect
                                                </Button>
                                            </AdminStickyBar>
                                        </div>
                                    }
                                    detail={
                                        <EntryDetailPanel
                                            entry={editingEntry}
                                            onEntryChange={setEditingEntry}
                                            onSave={() => void saveEntry()}
                                            onDelete={() =>
                                                setEntryDeleteOpen(true)
                                            }
                                            saving={savingEntry}
                                        />
                                    }
                                />
                            </AdminSection>
                        ) : null}
                    </div>
                </AdminShell>
            </RoleGuard>

            <EntityDetailDrawer
                open={entryDrawerOpen}
                onOpenChange={setEntryDrawerOpen}
                title={editingEntry?.food?.name || 'Meal log detail'}
                description="Mobile drill-in for correcting a recent meal log."
            >
                <EntryDetailPanel
                    entry={editingEntry}
                    onEntryChange={setEditingEntry}
                    onSave={() => void saveEntry()}
                    onDelete={() => setEntryDeleteOpen(true)}
                    saving={savingEntry}
                />
            </EntityDetailDrawer>

            <ConfirmActionDialogWithReason
                open={foodDeleteOpen}
                onOpenChange={setFoodDeleteOpen}
                title="Delete food from catalog"
                description="This removes the catalog entry and stores the reason in the admin audit log."
                confirmLabel="Delete food"
                busy={savingFood}
                onConfirm={(reason) => void deleteFood(reason)}
            />

            <ConfirmActionDialogWithReason
                open={entryDeleteOpen}
                onOpenChange={setEntryDeleteOpen}
                title="Delete meal entry"
                description="This removes the meal log and stores the reason in the admin audit log."
                confirmLabel="Delete entry"
                busy={savingEntry}
                onConfirm={(reason) => void deleteEntry(reason)}
            />
        </>
    );
}

function Field({
    label,
    value,
    onChange,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
}) {
    return (
        <label className="space-y-2">
            <span className="text-sm font-medium text-foreground">{label}</span>
            <AdminInput
                value={value}
                onChange={(event) => onChange(event.target.value)}
            />
        </label>
    );
}
