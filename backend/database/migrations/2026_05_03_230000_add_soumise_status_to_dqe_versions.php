<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE dqe_versions DROP CONSTRAINT IF EXISTS dqe_versions_status_check');
            DB::statement("ALTER TABLE dqe_versions ADD CONSTRAINT dqe_versions_status_check CHECK (status IN ('draft','soumise','validated','archived'))");
            DB::statement("ALTER TABLE dqe_versions ALTER COLUMN status SET DEFAULT 'draft'");
            DB::statement('ALTER TABLE dqe_versions ALTER COLUMN status SET NOT NULL');
            return;
        }

        DB::statement("ALTER TABLE dqe_versions MODIFY COLUMN status ENUM('draft','soumise','validated','archived') NOT NULL DEFAULT 'draft'");
    }

    public function down(): void
    {
        DB::statement("UPDATE dqe_versions SET status = 'draft' WHERE status = 'soumise'");

        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE dqe_versions DROP CONSTRAINT IF EXISTS dqe_versions_status_check');
            DB::statement("ALTER TABLE dqe_versions ADD CONSTRAINT dqe_versions_status_check CHECK (status IN ('draft','validated','archived'))");
            DB::statement("ALTER TABLE dqe_versions ALTER COLUMN status SET DEFAULT 'draft'");
            DB::statement('ALTER TABLE dqe_versions ALTER COLUMN status SET NOT NULL');
            return;
        }

        DB::statement("ALTER TABLE dqe_versions MODIFY COLUMN status ENUM('draft','validated','archived') NOT NULL DEFAULT 'draft'");
    }
};
