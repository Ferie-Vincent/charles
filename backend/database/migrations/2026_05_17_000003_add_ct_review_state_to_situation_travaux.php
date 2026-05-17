<?php

use App\Models\User;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $driver = DB::getDriverName();

        if ($driver === 'pgsql') {
            DB::statement("ALTER TABLE situation_travaux DROP CONSTRAINT IF EXISTS situation_travaux_status_check");
            DB::statement("ALTER TABLE situation_travaux ADD CONSTRAINT situation_travaux_status_check CHECK (status IN ('brouillon','en_revue_ct','en_revue_dt','soumise','contestee','validee_moe','payee'))");
        } elseif ($driver === 'mysql') {
            DB::statement("ALTER TABLE situation_travaux MODIFY COLUMN status ENUM('brouillon','en_revue_ct','en_revue_dt','soumise','contestee','validee_moe','payee') NOT NULL DEFAULT 'brouillon'");
        }

        Schema::table('situation_travaux', function (Blueprint $table) use ($driver) {
            $ctReviewedBy = $table->foreignId('ct_reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            if ($driver === 'mysql') {
                $ctReviewedBy->after('reviewed_by');
            }

            $ctReviewedAt = $table->timestamp('ct_reviewed_at')->nullable();
            if ($driver === 'mysql') {
                $ctReviewedAt->after('ct_reviewed_by');
            }

            $ctRejectionComment = $table->text('ct_rejection_comment')->nullable();
            if ($driver === 'mysql') {
                $ctRejectionComment->after('ct_reviewed_at');
            }
        });
    }

    public function down(): void
    {
        $driver = DB::getDriverName();

        Schema::table('situation_travaux', function (Blueprint $table) {
            $table->dropForeignIdFor(User::class, 'ct_reviewed_by');
            $table->dropColumn(['ct_reviewed_by', 'ct_reviewed_at', 'ct_rejection_comment']);
        });

        if ($driver === 'pgsql') {
            DB::statement("ALTER TABLE situation_travaux DROP CONSTRAINT IF EXISTS situation_travaux_status_check");
            DB::statement("ALTER TABLE situation_travaux ADD CONSTRAINT situation_travaux_status_check CHECK (status IN ('brouillon','en_revue_dt','soumise','contestee','validee_moe','payee'))");
        } elseif ($driver === 'mysql') {
            DB::statement("ALTER TABLE situation_travaux MODIFY COLUMN status ENUM('brouillon','en_revue_dt','soumise','contestee','validee_moe','payee') NOT NULL DEFAULT 'brouillon'");
        }
    }
};
