<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Paramètres financiers configurables — défaut entreprise, surcharge par chantier.
 *
 * Avant : TVA 18 % et retenue de garantie 5 % lus dans config/btp.php pour tous les chantiers.
 * Réalité CI : marchés exonérés de TVA (financements bailleurs), RG négociée à 10 %, délais de
 * paiement MOA très variables (30 j privé, 60–90 j public). Résolution : projet → company → config.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('companies', function (Blueprint $table) {
            $table->decimal('tva_rate', 5, 2)->default(18.00)->after('slug');
            $table->decimal('retenue_garantie_pct', 5, 2)->default(5.00)->after('tva_rate');
            $table->unsignedSmallInteger('delai_paiement_jours')->default(60)->after('retenue_garantie_pct');
        });

        Schema::table('projects', function (Blueprint $table) {
            // NULL = hériter du défaut entreprise
            $table->decimal('tva_rate', 5, 2)->nullable()->after('montant_marche');
            $table->decimal('retenue_garantie_pct', 5, 2)->nullable()->after('tva_rate');
            $table->unsignedSmallInteger('delai_paiement_jours')->nullable()->after('retenue_garantie_pct');
        });
    }

    public function down(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            $table->dropColumn(['tva_rate', 'retenue_garantie_pct', 'delai_paiement_jours']);
        });
        Schema::table('companies', function (Blueprint $table) {
            $table->dropColumn(['tva_rate', 'retenue_garantie_pct', 'delai_paiement_jours']);
        });
    }
};
