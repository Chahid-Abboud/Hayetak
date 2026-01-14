<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FoodFavorite extends Model
{
    protected $fillable = ['user_id', 'food_id'];
}
