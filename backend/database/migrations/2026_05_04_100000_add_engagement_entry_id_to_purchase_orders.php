<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('purchase_orders', function (Blueprint $table) {
            $table->foreignId('engagement_entry_id')
                ->nullable()
                ->after('approved_at')
                ->constrained('budget_entries')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('purchase_orders', function (Blueprint $table) {
            $table->dropForeignIdFor(\App\Models\BudgetEntry::class, 'engagement_entry_id');
            $table->dropColumn('engagement_entry_id');
        });
    }
};
