<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            if (!Schema::hasColumn('projects', 'lifecycle_status')) {
                $table->enum('lifecycle_status', [
                    'ao', 'attribution', 'preparation', 'execution', 'reception', 'cloture'
                ])->default('execution')->after('status');
            }
            if (!Schema::hasColumn('projects', 'caution_bonne_execution_pct')) {
                $table->decimal('caution_bonne_execution_pct', 5, 2)->default(5.00)->nullable()->after('budget_amount');
            }
            if (!Schema::hasColumn('projects', 'penalites_retard_par_jour')) {
                $table->decimal('penalites_retard_par_jour', 12, 2)->nullable()->after('caution_bonne_execution_pct');
            }
        });
    }

    public function down(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            $table->dropColumn(['lifecycle_status', 'caution_bonne_execution_pct', 'penalites_retard_par_jour']);
        });
    }
};
