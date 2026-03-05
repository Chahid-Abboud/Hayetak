<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class PlacesLocalSeeder extends Seeder
{
    public function run(): void
    {
        if (! Schema::hasTable('places_local')) {
            return;
        }

        $now = now();

        $places = [
            // Gyms
            ['name' => 'Olympia Gym Jounieh', 'category' => 'gym', 'address' => 'Main Hwy, Jounieh', 'city' => 'Jounieh', 'lat' => 33.980500, 'lng' => 35.640200],
            ['name' => 'Fitness Zone Zouk Mosbeh', 'category' => 'gym', 'address' => 'Zouk Mosbeh Highway', 'city' => 'Zouk Mosbeh', 'lat' => 33.955900, 'lng' => 35.619800],
            ['name' => 'Shape Up Gym Zouk Mikael', 'category' => 'gym', 'address' => 'Zouk Mikael Main Road', 'city' => 'Zouk Mikael', 'lat' => 33.967600, 'lng' => 35.615300],
            ['name' => 'Body Garage Kaslik', 'category' => 'gym', 'address' => 'Kaslik Main Road', 'city' => 'Kaslik', 'lat' => 33.980900, 'lng' => 35.629900],
            ['name' => 'U Energy Dbayeh', 'category' => 'gym', 'address' => 'Dbayeh Highway', 'city' => 'Dbayeh', 'lat' => 33.939700, 'lng' => 35.585800],
            ['name' => 'Black Belt Gym Zalka', 'category' => 'gym', 'address' => 'Zalka Highway', 'city' => 'Zalka', 'lat' => 33.907300, 'lng' => 35.574800],
            ['name' => 'Gold Fitness Antelias', 'category' => 'gym', 'address' => 'Antelias Main Street', 'city' => 'Antelias', 'lat' => 33.916900, 'lng' => 35.579900],
            ['name' => 'Byblos Gym', 'category' => 'gym', 'address' => 'Byblos Old Town', 'city' => 'Jbeil', 'lat' => 34.121400, 'lng' => 35.651200],
            ['name' => 'Spartan Fitness Adonis', 'category' => 'gym', 'address' => 'Adonis Highway', 'city' => 'Adonis', 'lat' => 33.964500, 'lng' => 35.617200],
            ['name' => 'Titanium Gym Jounieh', 'category' => 'gym', 'address' => 'Kaslik Area', 'city' => 'Jounieh', 'lat' => 33.981200, 'lng' => 35.629500],
            ['name' => 'Energy Club Dbayeh', 'category' => 'gym', 'address' => 'Dbayeh Seaside', 'city' => 'Dbayeh', 'lat' => 33.939300, 'lng' => 35.585200],
            ['name' => 'Hard Rock Gym Zouk', 'category' => 'gym', 'address' => 'Zouk Area', 'city' => 'Zouk Mikael', 'lat' => 33.962800, 'lng' => 35.615700],
            ['name' => 'Impact Gym Jbeil', 'category' => 'gym', 'address' => 'Byblos Highway', 'city' => 'Jbeil', 'lat' => 34.120800, 'lng' => 35.649700],
            ['name' => 'Pro Gym Antelias', 'category' => 'gym', 'address' => 'Antelias Main Road', 'city' => 'Antelias', 'lat' => 33.917900, 'lng' => 35.580900],
            ['name' => 'Extreme Fitness Zalka', 'category' => 'gym', 'address' => 'Zalka Boulevard', 'city' => 'Zalka', 'lat' => 33.906900, 'lng' => 35.573900],

            // Nutritionists / clinics
            ['name' => 'Diet Center Jounieh', 'category' => 'nutritionist', 'address' => 'Kaslik/Jounieh Hwy', 'city' => 'Jounieh', 'lat' => 33.977800, 'lng' => 35.630700],
            ['name' => 'Nutri Clinic Jbeil', 'category' => 'nutritionist', 'address' => 'Byblos Center', 'city' => 'Jbeil', 'lat' => 34.121900, 'lng' => 35.650300],
            ['name' => 'Healthy Bites Nutrition Zouk', 'category' => 'nutritionist', 'address' => 'Zouk Mikael', 'city' => 'Zouk Mikael', 'lat' => 33.962100, 'lng' => 35.615800],
            ['name' => 'Diet & More Zalka', 'category' => 'nutritionist', 'address' => 'Zalka Main Road', 'city' => 'Zalka', 'lat' => 33.907900, 'lng' => 35.575900],
            ['name' => 'Wellness Clinic Dbayeh', 'category' => 'nutritionist', 'address' => 'Dbayeh Village', 'city' => 'Dbayeh', 'lat' => 33.942500, 'lng' => 35.587900],
            ['name' => 'Slim & Healthy Antelias', 'category' => 'nutritionist', 'address' => 'Antelias Main Road', 'city' => 'Antelias', 'lat' => 33.917800, 'lng' => 35.579200],
            ['name' => 'Nutrition Experts Kaslik', 'category' => 'nutritionist', 'address' => 'Kaslik Highway', 'city' => 'Kaslik', 'lat' => 33.981700, 'lng' => 35.628900],
            ['name' => 'Lebanon Diet Clinic Jounieh', 'category' => 'nutritionist', 'address' => 'Jounieh Main Street', 'city' => 'Jounieh', 'lat' => 33.979500, 'lng' => 35.631500],
            ['name' => 'NutriHealth Zouk', 'category' => 'nutritionist', 'address' => 'Zouk Area', 'city' => 'Zouk Mikael', 'lat' => 33.963400, 'lng' => 35.616700],
        ];

        foreach ($places as $place) {
            DB::table('places_local')->updateOrInsert(
                [
                    'name' => $place['name'],
                    'category' => $place['category'],
                    'city' => $place['city'],
                ],
                [
                    'user_id' => null,
                    'address' => $place['address'],
                    'lat' => $place['lat'],
                    'lng' => $place['lng'],
                    'meta' => json_encode([
                        'source' => 'seed',
                        'seed' => 'PlacesLocalSeeder',
                    ], JSON_UNESCAPED_UNICODE),
                    'updated_at' => $now,
                    'created_at' => $now,
                ]
            );
        }
    }
}
