<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            // BTP CI: type de facturation (situation de travaux = mode dominant BTP)
            $table->enum('type_facturation', [
                'facture',
                'situation_travaux',
                'acompte',
                'decompte_final',
            ])->default('facture')->after('category');

            // Retenue de garantie — obligatoire marchés publics CI (art. 133 CCAG-Travaux)
            // Typiquement 5 % retenu sur chaque décompte, libéré après réception définitive
            $table->decimal('retenue_garantie_pct', 5, 2)->default(0)->after('amount_ttc');
            $table->decimal('retenue_garantie_amount', 15, 2)->default(0)->after('retenue_garantie_pct');

            // Retenue à la source DGI CI — précompte IR sur prestations de services
            $table->decimal('ras_pct', 5, 2)->default(0)->after('retenue_garantie_amount');
            $table->decimal('ras_amount', 15, 2)->default(0)->after('ras_pct');

            // Montant net à payer (TTC - RDG - RAS)
            $table->decimal('net_a_payer', 15, 2)->nullable()->after('ras_amount');
        });
    }

    public function down(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->dropColumn([
                'type_facturation',
                'retenue_garantie_pct',
                'retenue_garantie_amount',
                'ras_pct',
                'ras_amount',
                'net_a_payer',
            ]);
        });
    }
};
