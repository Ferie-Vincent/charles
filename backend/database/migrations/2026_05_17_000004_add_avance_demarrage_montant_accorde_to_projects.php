<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            // Frozen amount: set once when the advance is granted to avoid drift when montant_marche changes
            $table->decimal('avance_demarrage_montant_accorde', 15, 2)->nullable()->after('avance_demarrage_pct');
        });
    }

    public function down(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            $table->dropColumn('avance_demarrage_montant_accorde');
        });
    }
};
