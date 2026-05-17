<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        \DB::statement("ALTER TABLE situation_travaux MODIFY COLUMN status ENUM(
            'brouillon','en_revue_ct','en_revue_dt','soumise','contestee','validee_moe','payee'
        ) NOT NULL DEFAULT 'brouillon'");

        Schema::table('situation_travaux', function (Blueprint $table) {
            $table->foreignId('ct_reviewed_by')->nullable()->after('dt_reviewed_at')->constrained('users')->nullOnDelete();
            $table->timestamp('ct_reviewed_at')->nullable()->after('ct_reviewed_by');
            $table->text('ct_rejection_comment')->nullable()->after('ct_reviewed_at');
        });
    }

    public function down(): void
    {
        Schema::table('situation_travaux', function (Blueprint $table) {
            $table->dropForeignIdFor(\App\Models\User::class, 'ct_reviewed_by');
            $table->dropColumn(['ct_reviewed_by', 'ct_reviewed_at', 'ct_rejection_comment']);
        });

        \DB::statement("ALTER TABLE situation_travaux MODIFY COLUMN status ENUM(
            'brouillon','en_revue_dt','soumise','contestee','validee_moe','payee'
        ) NOT NULL DEFAULT 'brouillon'");
    }
};
