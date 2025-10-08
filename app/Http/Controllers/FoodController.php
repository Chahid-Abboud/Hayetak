<?php 
// app/Http/Controllers/FoodController.php
namespace App\Http\Controllers;

use App\Models\Food;
use Illuminate\Http\Request;

class FoodController extends Controller
{
    public function search(Request $request)
    {
        $q = trim((string) $request->query('q', ''));
        $perPage = 10;

        $foods = Food::query()
            ->when($q !== '', fn($qq) =>
                $qq->where('name', 'ILIKE', "%{$q}%")
            )
            ->orderBy('name')
            ->paginate($perPage);

        // Map items to include *_kcal and *_g aliases the TS file accepts
        $foods->getCollection()->transform(function (Food $f) {
            return [
                'id'            => $f->id,
                'name'          => $f->name,
                'serving_unit'  => $f->serving_unit,
                'serving_size'  => $f->serving_size,
                'calories'      => (int) $f->calories,
                'calories_kcal' => (int) $f->calories,
                'protein'       => (int) $f->protein,
                'protein_g'     => (int) $f->protein,
                'carbs'         => (int) $f->carbs,
                'carbs_g'       => (int) $f->carbs,
                'fat'           => (int) $f->fat,
                'fat_g'         => (int) $f->fat,
            ];
        });

        return response()->json($foods);
    }
}
