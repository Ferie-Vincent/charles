<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('dismissed_alerts', function (Blueprint $table) {
            $table->timestamp('reappears_at')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('dismissed_alerts', function (Blueprint $table) {
            $table->timestamp('reappears_at')->nullable(false)->change();
        });
    }
};
