<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_dietary_restrictions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('kind', 30); // allergy|diet_type|avoidance
            $table->string('value', 120);
            $table->text('notes')->nullable();
            $table->string('source', 40)->default('profile_sync');
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['user_id', 'kind', 'is_active']);
            $table->index(['user_id', 'source']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_dietary_restrictions');
    }
};
