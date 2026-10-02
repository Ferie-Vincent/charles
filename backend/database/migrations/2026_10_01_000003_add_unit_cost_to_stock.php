<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Valorisation du stock (lien stock central ↔ coût chantier).
 *
 * stock_items.unit_cost     : prix unitaire moyen pondéré, recalculé à chaque entrée valorisée (BDC)
 * stock_movements.unit_cost : PU figé au moment du mouvement (audit : le PMP évolue ensuite)
 * stock_movements.total_cost: quantité × unit_cost — une sortie vers un chantier = coût matériaux consommés
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('stock_items', function (Blueprint $table) {
            $table->decimal('unit_cost', 15, 2)->default(0)->after('threshold');
        });

        Schema::table('stock_movements', function (Blueprint $table) {
            $table->decimal('unit_cost', 15, 2)->nullable()->after('quantity');
            $table->decimal('total_cost', 15, 2)->nullable()->after('unit_cost');
            $table->index(['project_id', 'type'], 'stock_movements_project_type_idx');
        });
    }

    public function down(): void
    {
        Schema::table('stock_movements', function (Blueprint $table) {
            $table->dropIndex('stock_movements_project_type_idx');
            $table->dropColumn(['unit_cost', 'total_cost']);
        });
        Schema::table('stock_items', function (Blueprint $table) {
            $table->dropColumn('unit_cost');
        });
    }
};
