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
            DB::statement("ALTER TABLE situation_travaux ADD CONSTRAINT situation_travaux_status_check CHECK (status IN ('brouillon','en_revue_dt','soumise','contestee','validee_moe','payee'))");
        } elseif ($driver === 'mysql') {
            DB::statement("ALTER TABLE situation_travaux MODIFY COLUMN status ENUM('brouillon','en_revue_dt','soumise','contestee','validee_moe','payee') NOT NULL DEFAULT 'brouillon'");
        }

        Schema::table('situation_travaux', function (Blueprint $table) use ($driver) {
            $dtReviewedBy = $table->foreignId('dt_reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            if ($driver === 'mysql') {
                $dtReviewedBy->after('validated_by');
            }

            $dtReviewedAt = $table->timestamp('dt_reviewed_at')->nullable();
            if ($driver === 'mysql') {
                $dtReviewedAt->after('dt_reviewed_by');
            }

            $dtRejectionComment = $table->text('dt_rejection_comment')->nullable();
            if ($driver === 'mysql') {
                $dtRejectionComment->after('dt_reviewed_at');
            }

            $contestReason = $table->text('contest_reason')->nullable();
            if ($driver === 'mysql') {
                $contestReason->after('dt_rejection_comment');
            }

            $contestedAt = $table->timestamp('contested_at')->nullable();
            if ($driver === 'mysql') {
                $contestedAt->after('contest_reason');
            }

            $contestedBy = $table->foreignId('contested_by')->nullable()->constrained('users')->nullOnDelete();
            if ($driver === 'mysql') {
                $contestedBy->after('contested_at');
            }
        });
    }

    public function down(): void
    {
        $driver = DB::getDriverName();

        Schema::table('situation_travaux', function (Blueprint $table) {
            $table->dropForeignIdFor(User::class, 'dt_reviewed_by');
            $table->dropForeignIdFor(User::class, 'contested_by');

            $table->dropColumn([
                'dt_reviewed_by',
                'dt_reviewed_at',
                'dt_rejection_comment',
                'contest_reason',
                'contested_at',
                'contested_by',
            ]);
        });

        if ($driver === 'pgsql') {
            DB::statement("ALTER TABLE situation_travaux DROP CONSTRAINT IF EXISTS situation_travaux_status_check");
            DB::statement("ALTER TABLE situation_travaux ADD CONSTRAINT situation_travaux_status_check CHECK (status IN ('brouillon','soumise','validee_moe','payee'))");
        } elseif ($driver === 'mysql') {
            DB::statement("ALTER TABLE situation_travaux MODIFY COLUMN status ENUM('brouillon','soumise','validee_moe','payee') NOT NULL DEFAULT 'brouillon'");
        }
    }
};
