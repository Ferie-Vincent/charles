<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Acteurs externes au workflow situation (Mary, round 1) — SANS nouvel état bloquant.
 *
 * Après le visa MOE (validee_moe), l'étape réellement bloquante pour l'encaissement est côté MOA :
 * attestation de service fait, puis ordre de paiement (marchés publics CI : 60–90 j). On les
 * trace comme champs datés ; la machine d'états reste à 7 états. La date de service fait
 * devient la base la plus fiable pour estimer l'encaissement (BudgetController::expectedReceivables).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('situation_travaux', function (Blueprint $table) {
            $table->date('service_fait_at')->nullable()->after('validated_at');
            $table->string('ordre_paiement_ref', 100)->nullable()->after('service_fait_at');
            $table->date('ordre_paiement_at')->nullable()->after('ordre_paiement_ref');
        });
    }

    public function down(): void
    {
        Schema::table('situation_travaux', function (Blueprint $table) {
            $table->dropColumn(['service_fait_at', 'ordre_paiement_ref', 'ordre_paiement_at']);
        });
    }
};
