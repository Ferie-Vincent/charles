<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('dqe_versions', function (Blueprint $table) {
            if (!Schema::hasColumn('dqe_versions', 'bpu_version_id')) {
                $table->foreignId('bpu_version_id')->nullable()->constrained('bpu_versions')->nullOnDelete()->after('project_id');
            }
        });
    }

    public function down(): void
    {
        Schema::table('dqe_versions', function (Blueprint $table) {
            $table->dropForeign(['bpu_version_id']);
            $table->dropColumn('bpu_version_id');
        });
    }
};
