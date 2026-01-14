<?php

namespace App\Http\Controllers;

use App\Models\Food;
use App\Models\FoodFavorite;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class FoodFavoriteController extends Controller
{
    public function toggle(Food $food)
    {
        $userId = Auth::id();

        $fav = FoodFavorite::where('user_id', $userId)->where('food_id', $food->id)->first();
        if ($fav) {
            $fav->delete();
            return response()->json(['is_favorite' => false]);
        }

        FoodFavorite::create(['user_id' => $userId, 'food_id' => $food->id]);
        return response()->json(['is_favorite' => true]);
    }

    public function index()
    {
        $userId = Auth::id();

        $foods = Food::query()
            ->join('food_favorites as ff', 'ff.food_id', '=', 'foods.id')
            ->where('ff.user_id', $userId)
            ->orderByDesc('ff.created_at')
            ->limit(30)
            ->get(['foods.*']);

        return response()->json($foods);
    }
}
