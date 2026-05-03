<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE dqe_versions MODIFY COLUMN status ENUM('draft','soumise','validated','archived') NOT NULL DEFAULT 'draft'");
    }

    public function down(): void
    {
        DB::statement("UPDATE dqe_versions SET status = 'draft' WHERE status = 'soumise'");
        DB::statement("ALTER TABLE dqe_versions MODIFY COLUMN status ENUM('draft','validated','archived') NOT NULL DEFAULT 'draft'");
    }
};
