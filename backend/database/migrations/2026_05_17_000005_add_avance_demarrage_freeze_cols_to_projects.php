<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            $table->date('avance_demarrage_accorde_le')->nullable()->after('avance_demarrage_montant_accorde');
            $table->foreignId('avance_demarrage_accorde_par')->nullable()->after('avance_demarrage_accorde_le')
                ->constrained('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            $table->dropForeign(['avance_demarrage_accorde_par']);
            $table->dropColumn(['avance_demarrage_accorde_le', 'avance_demarrage_accorde_par']);
        });
    }
};
