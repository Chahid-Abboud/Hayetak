<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class MountLebanonHealthcarePlacesSeeder extends Seeder
{
    public function run(): void
    {
        if (! Schema::hasTable('places_local')) {
            return;
        }

        $now = now();
        $hasDescription = Schema::hasColumn('places_local', 'description');
        $hasGoogleMapsLink = Schema::hasColumn('places_local', 'google_maps_link');
        $hasLastVerifiedAt = Schema::hasColumn('places_local', 'last_verified_at');

        $places = [
            [
                'name' => 'Abou Jaoudeh Hospital',
                'category' => 'hospital',
                'address' => 'Jal El Dib / Antelias area',
                'city' => 'Metn',
                'lat' => 33.907491,
                'lng' => 35.581801,
                'phone' => '+9614718000;+9614716000',
                'website' => 'https://www.hopitalaboujaoude.com',
                'osm_type' => 'way',
                'osm_id' => 1050031779,
                'description' => 'General hospital in the Metn area, seeded for healthcare discovery on the Nearby map.',
            ],
            [
                'name' => 'Al Saydeh Hospital',
                'category' => 'hospital',
                'address' => 'Antelias / Naqqache area',
                'city' => 'Metn',
                'lat' => 33.910062,
                'lng' => 35.587414,
                'phone' => '+9614713100;+9614713101;+9614713102;+9614713103',
                'website' => null,
                'osm_type' => 'node',
                'osm_id' => 3707567031,
                'description' => 'Hospital in the Antelias and Naqqache corridor, added as a verified local healthcare point.',
            ],
            [
                'name' => 'Bellevue Medical Center',
                'category' => 'hospital',
                'address' => 'Mansourieh area',
                'city' => 'Baabda',
                'lat' => 33.848304,
                'lng' => 35.559473,
                'phone' => '+961 1 682 666',
                'website' => 'http://www.bmchcs.com',
                'osm_type' => 'way',
                'osm_id' => 994902555,
                'description' => 'Hospital in Baabda district, included for Nearby healthcare support.',
            ],
            [
                'name' => 'Bchamoun Hospital',
                'category' => 'hospital',
                'address' => 'Bchamoun',
                'city' => 'Aley',
                'lat' => 33.782867,
                'lng' => 35.523148,
                'phone' => '+9615270970',
                'website' => null,
                'osm_type' => 'node',
                'osm_id' => 4661434309,
                'description' => 'Hospital serving Bchamoun and nearby Aley district communities.',
            ],
            [
                'name' => 'Daher El Bachek Government Hospital',
                'category' => 'hospital',
                'address' => 'Dahr El Bachek area',
                'city' => 'Metn',
                'lat' => 33.882715,
                'lng' => 35.599261,
                'phone' => '+9614872144',
                'website' => null,
                'osm_type' => 'way',
                'osm_id' => 443538011,
                'description' => 'Government hospital in the Metn area, mapped for healthcare access from Nearby.',
            ],
            [
                'name' => 'Hospital Beit Chabab',
                'category' => 'hospital',
                'address' => 'Beit Chabab',
                'city' => 'Metn',
                'lat' => 33.932438,
                'lng' => 35.675237,
                'phone' => '+961 4 983 393',
                'website' => 'http://www.centrehospbc.com/',
                'osm_type' => 'way',
                'osm_id' => 993574780,
                'description' => 'Hospital in Beit Chabab, included to improve healthcare coverage outside the coast.',
            ],
            [
                'name' => 'Hospital Bhannes',
                'category' => 'hospital',
                'address' => 'Bhannes',
                'city' => 'Metn',
                'lat' => 33.905211,
                'lng' => 35.656311,
                'phone' => '+9614983770',
                'website' => null,
                'osm_type' => 'way',
                'osm_id' => 802992023,
                'description' => 'Bhannes hospital location, seeded as a healthcare place for mountain-area discovery.',
            ],
            [
                'name' => 'Middle East Institute of Health - University Hospital',
                'category' => 'hospital',
                'address' => 'Bsalim / Majzoub area',
                'city' => 'Metn',
                'lat' => 33.904492,
                'lng' => 35.597430,
                'phone' => null,
                'website' => null,
                'osm_type' => 'way',
                'osm_id' => 445619060,
                'description' => 'University hospital in the Bsalim and Majzoub area, added to the local healthcare directory.',
            ],
            [
                'name' => 'Mount Lebanon Hospital',
                'category' => 'hospital',
                'address' => 'Michel Garios Street',
                'city' => 'Baabda',
                'lat' => 33.860215,
                'lng' => 35.528082,
                'phone' => '+961 5 957 000',
                'website' => 'http://www.mlh.com.lb/',
                'osm_type' => 'way',
                'osm_id' => 409468812,
                'description' => 'Major hospital in Baabda district, seeded as a high-priority healthcare map point.',
            ],
            [
                'name' => 'Sacre Coeur Hospital',
                'category' => 'hospital',
                'address' => 'Hazmieh / Baabda area',
                'city' => 'Baabda',
                'lat' => 33.849214,
                'lng' => 35.539382,
                'phone' => '+9615453500',
                'website' => 'https://www.hsc-lb.com/',
                'osm_type' => 'way',
                'osm_id' => 583705258,
                'description' => 'Hospital in Baabda district, included for nearby healthcare and emergency discovery.',
            ],
            [
                'name' => 'Saint Charles Hospital',
                'category' => 'hospital',
                'address' => 'Fayadieh',
                'city' => 'Baabda',
                'lat' => 33.844920,
                'lng' => 35.550622,
                'phone' => null,
                'website' => null,
                'osm_type' => 'node',
                'osm_id' => 2932842648,
                'description' => 'Hospital in Fayadieh, mapped as part of Mount Lebanon healthcare support.',
            ],
            [
                'name' => 'Serhal Hospital',
                'category' => 'hospital',
                'address' => 'Rabieh / Metn area',
                'city' => 'Metn',
                'lat' => 33.914989,
                'lng' => 35.608505,
                'phone' => '+9614405050',
                'website' => 'http://www.hopitaldrsserhal.com/',
                'osm_type' => 'node',
                'osm_id' => 4461868278,
                'description' => 'Hospital in the Rabieh and Metn area, added as a local healthcare option.',
            ],
            [
                'name' => 'Clinilab',
                'category' => 'medical_lab',
                'address' => 'Hadath area',
                'city' => 'Baabda',
                'lat' => 33.849547,
                'lng' => 35.534945,
                'phone' => '+9615956011',
                'website' => null,
                'osm_type' => 'node',
                'osm_id' => 3107452692,
                'description' => 'Medical laboratory in Baabda district, included for lab and diagnostics discovery.',
            ],
            [
                'name' => 'Confidence Laboratory',
                'category' => 'medical_lab',
                'address' => 'Baabda district',
                'city' => 'Baabda',
                'lat' => 33.853364,
                'lng' => 35.518498,
                'phone' => '+9611558702',
                'website' => null,
                'osm_type' => 'node',
                'osm_id' => 5757100021,
                'description' => 'Medical laboratory location added to support diagnostics searches on the Nearby map.',
            ],
        ];

        foreach ($places as $place) {
            $values = [
                'user_id' => null,
                'address' => $place['address'],
                'lat' => $place['lat'],
                'lng' => $place['lng'],
                'meta' => json_encode([
                    'source' => 'openstreetmap_overpass',
                    'source_license' => 'ODbL',
                    'seed' => 'MountLebanonHealthcarePlacesSeeder',
                    'osm_type' => $place['osm_type'],
                    'osm_id' => $place['osm_id'],
                    'phone' => $place['phone'],
                    'website' => $place['website'],
                ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
                'updated_at' => $now,
                'created_at' => $now,
            ];

            if ($hasDescription) {
                $values['description'] = $place['description'];
            }
            if ($hasGoogleMapsLink) {
                $values['google_maps_link'] = sprintf(
                    'https://www.google.com/maps/search/?api=1&query=%.6F,%.6F',
                    $place['lat'],
                    $place['lng'],
                );
            }
            if ($hasLastVerifiedAt) {
                $values['last_verified_at'] = $now;
            }

            DB::table('places_local')->updateOrInsert(
                [
                    'name' => $place['name'],
                    'category' => $place['category'],
                    'city' => $place['city'],
                ],
                $values
            );
        }
    }
}
