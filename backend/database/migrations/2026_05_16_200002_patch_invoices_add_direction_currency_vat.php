<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            // direction distinguishes supplier invoices (fournisseur) from client billing (MOA)
            // currency + vat_rate already exist from 2026_05_03_210204_add_vat_to_invoices_table
            if (!Schema::hasColumn('invoices', 'direction')) {
                $table->enum('direction', ['fournisseur', 'client'])
                      ->default('fournisseur')->after('created_by');
            }
        });
    }

    public function down(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            if (Schema::hasColumn('invoices', 'direction')) {
                $table->dropColumn('direction');
            }
        });
    }
};
