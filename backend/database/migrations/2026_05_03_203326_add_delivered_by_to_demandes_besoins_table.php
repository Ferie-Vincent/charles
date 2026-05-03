<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('demandes_besoins', function (Blueprint $table) {
            $table->unsignedBigInteger('delivered_by')->nullable()->after('delivered_at');
            $table->foreign('delivered_by')->references('id')->on('users')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('demandes_besoins', function (Blueprint $table) {
            $table->dropForeign(['delivered_by']);
            $table->dropColumn('delivered_by');
        });
    }
};
