<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('project_workers', function (Blueprint $table) {
            // Add statut enum — active, congé, arrêt, démission, fin
            $table->enum('statut', ['active', 'conge', 'arret', 'demission', 'fin'])
                  ->default('active')->after('is_active');
            $table->date('date_start')->nullable()->after('statut');
            $table->date('date_end')->nullable()->after('date_start');
        });

        // Migrate existing active status
        \DB::statement("UPDATE project_workers SET statut = CASE WHEN `is_active` = 1 THEN 'active' ELSE 'fin' END");
    }

    public function down(): void
    {
        Schema::table('project_workers', function (Blueprint $table) {
            $table->dropColumn(['statut', 'date_start', 'date_end']);
        });
    }
};
