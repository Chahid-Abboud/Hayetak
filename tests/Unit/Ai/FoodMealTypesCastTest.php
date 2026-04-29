<?php

use App\Models\Food;

it('parses postgres text array meal types through the food model cast', function () {
    $food = new Food;
    $food->setRawAttributes([
        'meal_types' => '{breakfast,snack,dinner}',
    ], true);

    expect($food->meal_types)->toBe(['breakfast', 'snack', 'dinner']);
});
