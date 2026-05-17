<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('budget_entries', function (Blueprint $table) {
            $table->foreignId('situation_travaux_id')
                ->nullable()
                ->after('note')
                ->constrained('situation_travaux')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('budget_entries', function (Blueprint $table) {
            $table->dropForeignIdFor(\App\Models\SituationTravaux::class);
            $table->dropColumn('situation_travaux_id');
        });
    }
};
