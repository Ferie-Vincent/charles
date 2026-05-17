<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            $table->boolean('caution_liberee')->default(false)->after('caution_bonne_execution_pct');
            $table->date('caution_liberee_at')->nullable()->after('caution_liberee');
            $table->unsignedBigInteger('caution_liberee_par')->nullable()->after('caution_liberee_at');
            $table->foreign('caution_liberee_par')->references('id')->on('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            $table->dropForeign(['caution_liberee_par']);
            $table->dropColumn(['caution_liberee', 'caution_liberee_at', 'caution_liberee_par']);
        });
    }
};
