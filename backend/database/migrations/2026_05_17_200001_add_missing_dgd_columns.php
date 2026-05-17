<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('decomptes_generaux_definitifs', function (Blueprint $table) {
            // Controller writes date_signature_* but original migration only had timestamp columns
            $table->date('date_signature_entreprise')->nullable()->after('observations');
            $table->date('date_signature_moa')->nullable()->after('date_signature_entreprise');
            // Gap #10: store avance reliquat deducted in DGD for frontend display
            $table->decimal('avance_remboursement_restant', 15, 2)->default(0)->after('retenue_garantie_liberee');
        });
    }

    public function down(): void
    {
        Schema::table('decomptes_generaux_definitifs', function (Blueprint $table) {
            $table->dropColumn(['date_signature_entreprise', 'date_signature_moa', 'avance_remboursement_restant']);
        });
    }
};
