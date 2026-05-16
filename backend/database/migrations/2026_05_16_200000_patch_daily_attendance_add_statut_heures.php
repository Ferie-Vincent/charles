<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('daily_attendance', function (Blueprint $table) {
            // Replace present boolean with enum statut
            $table->enum('statut', ['present', 'absent', 'conge', 'maladie', 'demi_journee'])
                  ->default('present')->after('log_date');
            $table->decimal('heures_normales', 4, 2)->default(8.00)->after('statut');
            $table->decimal('heures_sup', 4, 2)->default(0)->after('heures_normales');
            // keep present boolean for backward compat — will derive from statut
        });

        // Migrate existing boolean data
        \DB::statement("UPDATE daily_attendance SET statut = CASE WHEN `present` = 1 THEN 'present' ELSE 'absent' END");
    }

    public function down(): void
    {
        Schema::table('daily_attendance', function (Blueprint $table) {
            $table->dropColumn(['statut', 'heures_normales', 'heures_sup']);
        });
    }
};
