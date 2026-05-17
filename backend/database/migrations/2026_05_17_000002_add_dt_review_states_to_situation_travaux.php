<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Expand ENUM — MySQL requires listing all values including existing ones
        \DB::statement("ALTER TABLE situation_travaux MODIFY COLUMN status ENUM(
            'brouillon','en_revue_dt','soumise','contestee','validee_moe','payee'
        ) NOT NULL DEFAULT 'brouillon'");

        Schema::table('situation_travaux', function (Blueprint $table) {
            $table->foreignId('dt_reviewed_by')->nullable()->after('validated_by')->constrained('users')->nullOnDelete();
            $table->timestamp('dt_reviewed_at')->nullable()->after('dt_reviewed_by');
            $table->text('dt_rejection_comment')->nullable()->after('dt_reviewed_at');
            $table->text('contest_reason')->nullable()->after('dt_rejection_comment');
            $table->timestamp('contested_at')->nullable()->after('contest_reason');
            $table->foreignId('contested_by')->nullable()->after('contested_at')->constrained('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('situation_travaux', function (Blueprint $table) {
            $table->dropForeignIdFor(\App\Models\User::class, 'dt_reviewed_by');
            $table->dropForeignIdFor(\App\Models\User::class, 'contested_by');
            $table->dropColumn(['dt_reviewed_by', 'dt_reviewed_at', 'dt_rejection_comment', 'contest_reason', 'contested_at', 'contested_by']);
        });

        \DB::statement("ALTER TABLE situation_travaux MODIFY COLUMN status ENUM(
            'brouillon','soumise','validee_moe','payee'
        ) NOT NULL DEFAULT 'brouillon'");
    }
};
