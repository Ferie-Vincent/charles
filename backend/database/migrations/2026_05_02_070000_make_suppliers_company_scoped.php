<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Step 1: add company_id nullable, add created_by nullable
        Schema::table('suppliers', function (Blueprint $table) {
            $table->foreignId('company_id')->nullable()->after('id')->constrained()->cascadeOnDelete();
            $table->foreignId('created_by')->nullable()->after('company_id')->constrained('users')->nullOnDelete();
        });

        // Step 2: backfill company_id from project->company_id
        // Sous-requête corrélée : syntaxe portable MySQL (tests/local) ET PostgreSQL (Render).
        // "UPDATE ... FROM" (pgsql) et "UPDATE ... JOIN" (mysql) ne sont pas interopérables.
        DB::statement('
            UPDATE suppliers
            SET company_id = (
                SELECT projects.company_id FROM projects WHERE projects.id = suppliers.project_id
            )
            WHERE suppliers.company_id IS NULL
        ');

        // Step 3: make company_id NOT NULL and project_id nullable
        Schema::table('suppliers', function (Blueprint $table) {
            $table->foreignId('company_id')->nullable(false)->change();
            $table->foreignId('project_id')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('suppliers', function (Blueprint $table) {
            $table->dropForeign(['company_id']);
            $table->dropForeign(['created_by']);
            $table->dropColumn(['company_id', 'created_by']);
            $table->foreignId('project_id')->nullable(false)->change();
        });
    }
};
