<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            // ── Foundation ──────────────────────────────────────────────
            RoleSeeder::class,
            UserSeeder::class,
            RolePermissionSeeder::class,

            // ── Projets + membres ────────────────────────────────────────
            ProjectSeeder::class,
            ProjectMemberSeeder::class,
            ProjectActivitySeeder::class,

            // ── Journaux + personnel terrain ─────────────────────────────
            DailyLogSeeder::class,
            ProjectWorkerSeeder::class,

            // ── DQE ──────────────────────────────────────────────────────
            DqeSeeder::class,

            // ── Fournisseurs (avant toute dépendance) ────────────────────
            SupplierSeeder::class,

            // ── Finance : prévisionnel → engagement → paiement ───────────
            BudgetEntrySeeder::class,
            PurchaseOrderSeeder::class,
            InvoiceSeeder::class,

            // ── Stocks ───────────────────────────────────────────────────
            StockSeeder::class,

            // ── QHSE ─────────────────────────────────────────────────────
            IncidentSeeder::class,

            // ── Contractuel ──────────────────────────────────────────────
            OrdreDeServiceSeeder::class,
            AvenantSeeder::class,

            // ── Dépenses générales + demandes ────────────────────────────
            GeneralExpenseSeeder::class,
            DemandeBesoinSeeder::class,
        ]);

        $this->command->info('Generating AI snapshots…');
        $this->callSilently('ai:build-snapshots');
    }
}
