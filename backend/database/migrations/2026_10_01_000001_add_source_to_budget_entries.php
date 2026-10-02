<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Idempotence des écritures budgétaires automatiques.
 *
 * Chaque budget_entry générée par un événement métier (approbation BDC, paiement facture,
 * approbation demande, paiement situation) porte désormais sa source. La contrainte unique
 * (source_type, source_id, type) rend physiquement impossible le double-comptage par retry
 * réseau ou double dispatch d'événement (cf. bug 4M/7M).
 *
 * Les saisies manuelles (BudgetController::store) gardent source_type = NULL — MySQL et
 * PostgreSQL autorisent plusieurs NULL dans un index unique.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('budget_entries', function (Blueprint $table) {
            $table->string('source_type', 40)->nullable()->after('note');
            $table->unsignedBigInteger('source_id')->nullable()->after('source_type');
            $table->unique(['source_type', 'source_id', 'type'], 'budget_entries_source_unique');
        });

        // ── Backfill portable (MySQL + PostgreSQL) ─────────────────────────────
        // BDC → engagement
        DB::statement("
            UPDATE budget_entries
            SET source_type = 'purchase_order',
                source_id   = (SELECT po.id FROM purchase_orders po WHERE po.engagement_entry_id = budget_entries.id)
            WHERE source_type IS NULL
              AND type = 'engagement'
              AND id IN (SELECT engagement_entry_id FROM purchase_orders WHERE engagement_entry_id IS NOT NULL)
        ");

        // Demande de besoin → pré-engagement (previsionnel)
        DB::statement("
            UPDATE budget_entries
            SET source_type = 'demande_besoin',
                source_id   = (SELECT d.id FROM demandes_besoins d WHERE d.preengagement_entry_id = budget_entries.id)
            WHERE source_type IS NULL
              AND type = 'previsionnel'
              AND id IN (SELECT preengagement_entry_id FROM demandes_besoins WHERE preengagement_entry_id IS NOT NULL)
        ");

        // Demande de besoin → paiement (comptabilisation)
        DB::statement("
            UPDATE budget_entries
            SET source_type = 'demande_besoin',
                source_id   = (SELECT d.id FROM demandes_besoins d WHERE d.budget_entry_id = budget_entries.id)
            WHERE source_type IS NULL
              AND type = 'paiement'
              AND id IN (SELECT budget_entry_id FROM demandes_besoins WHERE budget_entry_id IS NOT NULL)
        ");

        // Situation de travaux → paiement
        DB::statement("
            UPDATE budget_entries
            SET source_type = 'situation_travaux',
                source_id   = situation_travaux_id
            WHERE source_type IS NULL
              AND situation_travaux_id IS NOT NULL
        ");

        // Facture payée → paiement (rapprochement par libellé, meilleur effort)
        $invoices = DB::table('invoices')->where('status', 'payee')->get(['id', 'project_id', 'reference']);
        foreach ($invoices as $inv) {
            DB::table('budget_entries')
                ->whereNull('source_type')
                ->where('type', 'paiement')
                ->where('project_id', $inv->project_id)
                ->where('label', "Facture #{$inv->reference}")
                ->orderBy('id')
                ->limit(1)
                ->update(['source_type' => 'invoice', 'source_id' => $inv->id]);
        }
    }

    public function down(): void
    {
        Schema::table('budget_entries', function (Blueprint $table) {
            $table->dropUnique('budget_entries_source_unique');
            $table->dropColumn(['source_type', 'source_id']);
        });
    }
};
