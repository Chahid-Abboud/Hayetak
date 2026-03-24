import {
    AdminSection,
    AdminShell,
    AdminStatCard,
    AdminStatsGrid,
} from '@/components/admin/AdminShell';
import { ProductBanner, ProductEmptyState } from '@/components/product/page';
import {
    ProductTable,
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { jsonRequestInit } from '@/lib/http';
import { Head } from '@inertiajs/react';
import { Plus, RefreshCcw, Trash2 } from 'lucide-react';
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

export default function AdminMealsPage() {
    const [foods, setFoods] = useState<Food[]>([]);
    const [entries, setEntries] = useState<MealEntry[]>([]);
    const [foodQ, setFoodQ] = useState('');
    const [selectedFood, setSelectedFood] = useState<Food | null>(null);
    const [loadingFoods, setLoadingFoods] = useState(true);
    const [loadingEntries, setLoadingEntries] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const loadFoods = useCallback(async () => {
        setLoadingFoods(true);
        setError(null);

        try {
            const res = await fetch(
                `/api/admin/foods?q=${encodeURIComponent(foodQ)}`,
                { headers: { Accept: 'application/json' } },
            );

            if (!res.ok) {
                throw new Error('Could not load the food catalog.');
            }

            const json = await res.json();
            const nextFoods = Array.isArray(json?.data) ? json.data : [];
            setFoods(nextFoods);
            setSelectedFood((current) =>
                current && current.id === null
                    ? current
                    : current &&
                        nextFoods.some((food: Food) => food.id === current.id)
                      ? (nextFoods.find(
                            (food: Food) => food.id === current.id,
                        ) ?? null)
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

        try {
            const res = await fetch('/api/admin/meal-entries', {
                headers: { Accept: 'application/json' },
            });

            if (!res.ok) {
                throw new Error('Could not load recent meal entries.');
            }

            const json = await res.json();
            setEntries(Array.isArray(json?.data) ? json.data : []);
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
    }, []);

    useEffect(() => {
        void loadFoods();
    }, [loadFoods]);

    useEffect(() => {
        void loadEntries();
    }, [loadEntries]);

    const totalCalories = useMemo(
        () => foods.reduce((sum, food) => sum + Number(food.calories ?? 0), 0),
        [foods],
    );

    async function saveFood() {
        if (!selectedFood) return;

        setSaving(true);
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
            setSaving(false);
        }
    }

    async function deleteFood() {
        if (!selectedFood?.id) return;

        setSaving(true);
        setError(null);
        setSuccess(null);

        try {
            const response = await fetch(
                `/api/admin/foods/${selectedFood.id}`,
                jsonRequestInit('DELETE'),
            );

            if (!response.ok) {
                throw new Error('Could not delete this food.');
            }

            setSuccess('Food removed from the catalog.');
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

    return (
        <>
            <Head title="Admin Meals" />

            <RoleGuard roles={['admin']}>
                <AdminShell
                    title="Meals management"
                    description="Bring the food catalog and recent meal activity onto the same polished admin footing as the rest of the product."
                    actions={
                        <div className="flex flex-wrap items-center gap-2">
                            <Input
                                value={foodQ}
                                onChange={(event) =>
                                    setFoodQ(event.target.value)
                                }
                                placeholder="Search foods"
                                className="h-10 w-52 rounded-full"
                            />
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
                                label="Recent meal logs"
                                value={
                                    loadingEntries
                                        ? '...'
                                        : String(entries.length)
                                }
                                helper="Latest tracked entries across users."
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

                        {error ? (
                            <ProductBanner tone="danger">{error}</ProductBanner>
                        ) : null}
                        {success ? (
                            <ProductBanner tone="success">
                                {success}
                            </ProductBanner>
                        ) : null}

                        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(340px,0.9fr)]">
                            <AdminSection
                                title="Food catalog"
                                description="Search the catalog, review macros, and select any food to edit it."
                            >
                                {loadingFoods ? (
                                    <ProductEmptyState
                                        title="Loading foods"
                                        description="Fetching the latest food catalog."
                                    />
                                ) : (
                                    <ProductTable>
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
                                                    key={food.id ?? food.name}
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
                                                        {food.calories ?? 0}{' '}
                                                        kcal • P{' '}
                                                        {food.protein_g ?? 0} •
                                                        C {food.carbs_g ?? 0} •
                                                        F {food.fat_g ?? 0}
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
                                    </ProductTable>
                                )}
                            </AdminSection>

                            <AdminSection
                                title={
                                    selectedFood?.id === null
                                        ? 'Create food'
                                        : 'Edit food'
                                }
                                description="Keep catalog entries clean so planner and tracking experiences stay trustworthy."
                            >
                                {!selectedFood ? (
                                    <ProductEmptyState
                                        title="Select or create a food"
                                        description="Choose a row from the catalog or add a new food entry."
                                    />
                                ) : (
                                    <div className="space-y-4">
                                        <Field
                                            label="Food name"
                                            value={selectedFood.name}
                                            onChange={(value) =>
                                                setSelectedFood({
                                                    ...selectedFood,
                                                    name: value,
                                                })
                                            }
                                        />
                                        <Field
                                            label="Category"
                                            value={selectedFood.category ?? ''}
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
                                                    setSelectedFood({
                                                        ...selectedFood,
                                                        calories:
                                                            value === ''
                                                                ? null
                                                                : Number(value),
                                                    })
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
                                                    setSelectedFood({
                                                        ...selectedFood,
                                                        protein_g:
                                                            value === ''
                                                                ? null
                                                                : Number(value),
                                                    })
                                                }
                                            />
                                            <Field
                                                label="Carbs (g)"
                                                value={
                                                    selectedFood.carbs_g == null
                                                        ? ''
                                                        : String(
                                                              selectedFood.carbs_g,
                                                          )
                                                }
                                                onChange={(value) =>
                                                    setSelectedFood({
                                                        ...selectedFood,
                                                        carbs_g:
                                                            value === ''
                                                                ? null
                                                                : Number(value),
                                                    })
                                                }
                                            />
                                            <Field
                                                label="Fat (g)"
                                                value={
                                                    selectedFood.fat_g == null
                                                        ? ''
                                                        : String(
                                                              selectedFood.fat_g,
                                                          )
                                                }
                                                onChange={(value) =>
                                                    setSelectedFood({
                                                        ...selectedFood,
                                                        fat_g:
                                                            value === ''
                                                                ? null
                                                                : Number(value),
                                                    })
                                                }
                                            />
                                        </div>
                                        <div className="flex flex-wrap gap-3">
                                            <Button
                                                type="button"
                                                onClick={() => void saveFood()}
                                                disabled={
                                                    saving || !selectedFood.name
                                                }
                                            >
                                                {saving
                                                    ? 'Saving...'
                                                    : 'Save food'}
                                            </Button>
                                            {selectedFood.id ? (
                                                <Button
                                                    type="button"
                                                    variant="destructive"
                                                    onClick={() =>
                                                        void deleteFood()
                                                    }
                                                    disabled={saving}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                    Delete
                                                </Button>
                                            ) : null}
                                        </div>
                                    </div>
                                )}
                            </AdminSection>
                        </div>

                        <AdminSection
                            title="Recent meal logs"
                            description="A clearer read-only view of the most recent tracked meals across users."
                        >
                            {loadingEntries ? (
                                <ProductEmptyState
                                    title="Loading meal logs"
                                    description="Fetching the latest tracked entries."
                                />
                            ) : (
                                <ProductTable>
                                    <ProductTableHead>
                                        <tr>
                                            <ProductTableHeaderCell>
                                                User
                                            </ProductTableHeaderCell>
                                            <ProductTableHeaderCell>
                                                Meal
                                            </ProductTableHeaderCell>
                                            <ProductTableHeaderCell>
                                                Food
                                            </ProductTableHeaderCell>
                                            <ProductTableHeaderCell>
                                                Time
                                            </ProductTableHeaderCell>
                                        </tr>
                                    </ProductTableHead>
                                    <ProductTableBody>
                                        {entries.map((entry) => (
                                            <ProductTableRow key={entry.id}>
                                                <ProductTableCell>
                                                    <div className="space-y-1">
                                                        <div className="font-medium">
                                                            {personName(entry)}
                                                        </div>
                                                        <div className="text-xs text-muted-foreground">
                                                            User #
                                                            {entry.user_id}
                                                        </div>
                                                    </div>
                                                </ProductTableCell>
                                                <ProductTableCell>
                                                    <Badge
                                                        variant="outline"
                                                        className="rounded-full px-2.5 py-1 capitalize"
                                                    >
                                                        {entry.meal_type}
                                                    </Badge>
                                                    <div className="mt-2 text-xs text-muted-foreground">
                                                        Servings:{' '}
                                                        {entry.servings}
                                                    </div>
                                                </ProductTableCell>
                                                <ProductTableCell className="text-sm text-muted-foreground">
                                                    {entry.food?.name ||
                                                        `Food #${entry.food_id}`}
                                                </ProductTableCell>
                                                <ProductTableCell className="text-sm text-muted-foreground">
                                                    {new Date(
                                                        entry.eaten_at,
                                                    ).toLocaleString()}
                                                </ProductTableCell>
                                            </ProductTableRow>
                                        ))}
                                        {entries.length === 0 ? (
                                            <ProductTableEmptyRow
                                                colSpan={4}
                                                title="No recent meal logs"
                                                description="Meal activity will appear here once users continue tracking."
                                            />
                                        ) : null}
                                    </ProductTableBody>
                                </ProductTable>
                            )}
                        </AdminSection>
                    </div>
                </AdminShell>
            </RoleGuard>
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
            <Label>{label}</Label>
            <Input
                value={value}
                onChange={(event) => onChange(event.target.value)}
            />
        </label>
    );
}
