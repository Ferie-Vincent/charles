<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            // Identité du marché BTP (CCAG-Travaux CI)
            $table->enum('type_marche', [
                'forfait',
                'bordereau_prix',
                'depenses_controlees',
                'cle_en_main',
            ])->nullable()->after('status');

            $table->string('maitre_ouvrage', 200)->nullable()->after('type_marche');    // Maître d'ouvrage (client)
            $table->string('maitre_oeuvre', 200)->nullable()->after('maitre_ouvrage');  // BET / maître d'œuvre
            $table->string('bureau_controle', 200)->nullable()->after('maitre_oeuvre'); // Bureau de contrôle technique

            // Montants contractuels (CI: marché signé peut différer du budget DQE)
            $table->decimal('montant_marche', 15, 2)->nullable()->after('bureau_controle');  // Montant marché HT signé
            $table->unsignedTinyInteger('avance_demarrage_pct')->default(0)->after('montant_marche'); // % avance démarrage

            // Délai et pénalités contractuels
            $table->unsignedSmallInteger('delai_execution_jours')->nullable()->after('avance_demarrage_pct'); // Délai contractuel en jours

            // Réception BTP (en 2 temps : provisoire puis définitive 12 mois après)
            $table->date('date_reception_provisoire')->nullable()->after('end_date');
            $table->date('date_reception_definitive')->nullable()->after('date_reception_provisoire');
        });
    }

    public function down(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            $table->dropColumn([
                'type_marche',
                'maitre_ouvrage',
                'maitre_oeuvre',
                'bureau_controle',
                'montant_marche',
                'avance_demarrage_pct',
                'delai_execution_jours',
                'date_reception_provisoire',
                'date_reception_definitive',
            ]);
        });
    }
};
