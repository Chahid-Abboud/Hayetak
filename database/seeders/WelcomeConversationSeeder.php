<?php

namespace Database\Seeders;

use App\Services\Messaging\WelcomeConversationService;
use Illuminate\Database\Seeder;

class WelcomeConversationSeeder extends Seeder
{
    public function run(): void
    {
        app(WelcomeConversationService::class)->ensureForAllUsers();
    }
}
