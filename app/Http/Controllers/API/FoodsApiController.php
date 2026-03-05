<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Food;
use Illuminate\Http\Request;

class FoodsApiController extends Controller
{
    // GET /api/foods/search?q=apple
    public function search(Request $request)
    {
        $q = trim((string) $request->query('q', ''));
        $category = $request->query('category'); // optional

        $query = Food::query();

        if ($q !== '') {
            // PostgreSQL case-insensitive search
            $query->where('name', 'ILIKE', "%{$q}%");
        }
        if ($category) {
            $query->where('category', $category);
        }

        $page = $query
            ->select('id', 'name', 'serving_unit', 'serving_size', 'calories', 'protein', 'carbs', 'fat')
            ->orderBy('name')
            ->paginate(10);

        // frontend tolerates *_kcal and *_g aliases; add them for compatibility
        $page->getCollection()->transform(function ($f) {
            return [
                'id' => (int) $f->id,
                'name' => $f->name,
                'serving_unit' => $f->serving_unit,
                'serving_size' => (int) $f->serving_size,
                'calories' => (int) $f->calories,
                'calories_kcal' => (int) $f->calories,
                'protein' => (int) $f->protein,
                'protein_g' => (int) $f->protein,
                'carbs' => (int) $f->carbs,
                'carbs_g' => (int) $f->carbs,
                'fat' => (int) $f->fat,
                'fat_g' => (int) $f->fat,
            ];
        });

        return response()->json($page);
    }
}
