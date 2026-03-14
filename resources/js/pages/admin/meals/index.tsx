import NavHeader from '@/components/NavHeader';
import RoleGuard from '@/components/RoleGuard';
import { Head } from '@inertiajs/react';
import { useEffect, useState } from 'react';

type Food = { id: number; name: string; category?: string | null; calories?: number | null; protein_g?: number | null; carbs_g?: number | null; fat_g?: number | null };
type MealEntry = { id: number; user_id: number; food_id: number; meal_type: string; servings: string; eaten_at: string; food?: { id: number; name: string } };

export default function AdminMealsPage() {
    const [foods, setFoods] = useState<Food[]>([]);
    const [entries, setEntries] = useState<MealEntry[]>([]);
    const [foodQ, setFoodQ] = useState('');

    async function loadFoods() {
        const res = await fetch(`/api/admin/foods?q=${encodeURIComponent(foodQ)}`);
        const json = await res.json();
        setFoods(Array.isArray(json?.data) ? json.data : []);
    }

    async function loadEntries() {
        const res = await fetch('/api/admin/meal-entries');
        const json = await res.json();
        setEntries(Array.isArray(json?.data) ? json.data : []);
    }

    useEffect(() => { void loadFoods(); }, [foodQ]);
    useEffect(() => { void loadEntries(); }, []);

    async function editFood(f: Food) {
        const name = prompt('Food name', f.name) ?? f.name;
        const category = prompt('Category', f.category ?? '') ?? f.category ?? '';
        const calories = Number(prompt('Calories', String(f.calories ?? 0)) ?? f.calories ?? 0);
        await fetch(`/api/admin/foods/${f.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...f, name, category, calories }),
        });
        await loadFoods();
    }

    async function deleteFood(id: number) {
        await fetch(`/api/admin/foods/${id}`, { method: 'DELETE' });
        await loadFoods();
    }

    return (
        <>
            <Head title="Admin Meals" />
            <NavHeader />
            <main className="mx-auto max-w-6xl px-4 py-6">
                <RoleGuard roles={['admin']}>
                    <h1 className="mb-4 text-2xl font-semibold">Meals Management</h1>
                    <div className="grid gap-4 md:grid-cols-2">
                        <section className="rounded-2xl border bg-card p-3 shadow-sm">
                            <div className="mb-2 flex items-center justify-between">
                                <div className="font-medium">Food Catalog</div>
                                <input className="rounded-xl border bg-background px-3 py-2 text-sm" placeholder="Search" value={foodQ} onChange={(e) => setFoodQ(e.target.value)} />
                            </div>
                            <div className="max-h-96 space-y-2 overflow-auto">
                                {foods.map((f) => (
                                    <div key={f.id} className="rounded-xl border p-2 text-sm">
                                        <div className="font-medium">{f.name}</div>
                                        <div className="text-xs text-muted-foreground">{f.category ?? '-'} | {f.calories ?? 0} kcal</div>
                                        <div className="mt-1 flex gap-2 text-xs">
                                            <button className="font-medium text-primary underline" onClick={() => void editFood(f)}>Edit</button>
                                            <button className="font-medium text-destructive underline" onClick={() => void deleteFood(f.id)}>Delete</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                        <section className="rounded-2xl border bg-card p-3 shadow-sm">
                            <div className="mb-2 font-medium">Recent Meal Logs (entries)</div>
                            <div className="max-h-96 space-y-2 overflow-auto text-sm">
                                {entries.map((e) => (
                                    <div key={e.id} className="rounded-xl border p-2">
                                        <div>User #{e.user_id} - {e.meal_type} - {e.food?.name ?? e.food_id}</div>
                                        <div className="text-xs text-muted-foreground">{e.eaten_at} | servings: {e.servings}</div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>
                </RoleGuard>
            </main>
        </>
    );
}
