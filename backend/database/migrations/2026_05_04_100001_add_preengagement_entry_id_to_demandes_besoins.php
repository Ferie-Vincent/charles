<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('demandes_besoins', function (Blueprint $table) {
            $table->foreignId('preengagement_entry_id')
                ->nullable()
                ->after('budget_entry_id')
                ->constrained('budget_entries')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('demandes_besoins', function (Blueprint $table) {
            $table->dropForeignIdFor(\App\Models\BudgetEntry::class, 'preengagement_entry_id');
            $table->dropColumn('preengagement_entry_id');
        });
    }
};
