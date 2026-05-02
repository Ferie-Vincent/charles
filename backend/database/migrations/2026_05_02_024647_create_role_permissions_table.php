<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('role_permissions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('role_id')->constrained()->cascadeOnDelete();
            $table->string('feature');
            $table->boolean('enabled')->default(false);
            $table->timestamps();
            $table->unique(['company_id', 'role_id', 'feature']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('role_permissions');
    }
};
