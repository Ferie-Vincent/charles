<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // invoices.created_by — RESTRICT → nullOnDelete (make nullable)
        Schema::table('invoices', function (Blueprint $table) {
            $table->dropForeign('invoices_created_by_foreign');
            $table->unsignedBigInteger('created_by')->nullable()->change();
            $table->foreign('created_by')->references('id')->on('users')->nullOnDelete();
        });

        // budget_entries.created_by — RESTRICT → nullOnDelete (make nullable)
        Schema::table('budget_entries', function (Blueprint $table) {
            $table->dropForeign('budget_entries_created_by_foreign');
            $table->unsignedBigInteger('created_by')->nullable()->change();
            $table->foreign('created_by')->references('id')->on('users')->nullOnDelete();
        });

        // dqe_versions.created_by — RESTRICT → nullOnDelete (make nullable)
        Schema::table('dqe_versions', function (Blueprint $table) {
            $table->dropForeign('dqe_versions_created_by_foreign');
            $table->unsignedBigInteger('created_by')->nullable()->change();
            $table->foreign('created_by')->references('id')->on('users')->nullOnDelete();
        });

        // incidents.reported_by — RESTRICT → nullOnDelete (make nullable)
        Schema::table('incidents', function (Blueprint $table) {
            $table->dropForeign('incidents_reported_by_foreign');
            $table->unsignedBigInteger('reported_by')->nullable()->change();
            $table->foreign('reported_by')->references('id')->on('users')->nullOnDelete();
        });

        // demandes_besoins.requested_by — RESTRICT → nullOnDelete (make nullable)
        Schema::table('demandes_besoins', function (Blueprint $table) {
            $table->dropForeign('demandes_besoins_requested_by_foreign');
            $table->unsignedBigInteger('requested_by')->nullable()->change();
            $table->foreign('requested_by')->references('id')->on('users')->nullOnDelete();
        });

        // purchase_orders.requested_by — RESTRICT → nullOnDelete (make nullable)
        Schema::table('purchase_orders', function (Blueprint $table) {
            $table->dropForeign('purchase_orders_requested_by_foreign');
            $table->unsignedBigInteger('requested_by')->nullable()->change();
            $table->foreign('requested_by')->references('id')->on('users')->nullOnDelete();
        });

        // general_expenses.created_by — RESTRICT → nullOnDelete (make nullable)
        Schema::table('general_expenses', function (Blueprint $table) {
            $table->dropForeign('general_expenses_created_by_foreign');
            $table->unsignedBigInteger('created_by')->nullable()->change();
            $table->foreign('created_by')->references('id')->on('users')->nullOnDelete();
        });

        // stock_items.created_by — RESTRICT → nullOnDelete (make nullable)
        Schema::table('stock_items', function (Blueprint $table) {
            $table->dropForeign('stock_items_created_by_foreign');
            $table->unsignedBigInteger('created_by')->nullable()->change();
            $table->foreign('created_by')->references('id')->on('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        // Restore RESTRICT (NOT NULL + no cascade/set null action)
        Schema::table('invoices', function (Blueprint $table) {
            $table->dropForeign(['created_by']);
            $table->unsignedBigInteger('created_by')->nullable(false)->change();
            $table->foreign('created_by')->references('id')->on('users');
        });

        Schema::table('budget_entries', function (Blueprint $table) {
            $table->dropForeign(['created_by']);
            $table->unsignedBigInteger('created_by')->nullable(false)->change();
            $table->foreign('created_by')->references('id')->on('users');
        });

        Schema::table('dqe_versions', function (Blueprint $table) {
            $table->dropForeign(['created_by']);
            $table->unsignedBigInteger('created_by')->nullable(false)->change();
            $table->foreign('created_by')->references('id')->on('users');
        });

        Schema::table('incidents', function (Blueprint $table) {
            $table->dropForeign(['reported_by']);
            $table->unsignedBigInteger('reported_by')->nullable(false)->change();
            $table->foreign('reported_by')->references('id')->on('users');
        });

        Schema::table('demandes_besoins', function (Blueprint $table) {
            $table->dropForeign(['requested_by']);
            $table->unsignedBigInteger('requested_by')->nullable(false)->change();
            $table->foreign('requested_by')->references('id')->on('users');
        });

        Schema::table('purchase_orders', function (Blueprint $table) {
            $table->dropForeign(['requested_by']);
            $table->unsignedBigInteger('requested_by')->nullable(false)->change();
            $table->foreign('requested_by')->references('id')->on('users');
        });

        Schema::table('general_expenses', function (Blueprint $table) {
            $table->dropForeign(['created_by']);
            $table->unsignedBigInteger('created_by')->nullable(false)->change();
            $table->foreign('created_by')->references('id')->on('users');
        });

        Schema::table('stock_items', function (Blueprint $table) {
            $table->dropForeign(['created_by']);
            $table->unsignedBigInteger('created_by')->nullable(false)->change();
            $table->foreign('created_by')->references('id')->on('users');
        });
    }
};
