<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check');
            DB::statement("ALTER TABLE tasks ADD CONSTRAINT tasks_status_check CHECK (status IN ('todo','in_progress','blocked','done','cancelled'))");
            DB::statement("ALTER TABLE tasks ALTER COLUMN status SET DEFAULT 'todo'");
            DB::statement('ALTER TABLE tasks ALTER COLUMN status SET NOT NULL');
            return;
        }

        DB::statement("ALTER TABLE tasks MODIFY COLUMN status ENUM('todo','in_progress','blocked','done','cancelled') NOT NULL DEFAULT 'todo'");
    }

    public function down(): void
    {
        DB::statement("UPDATE tasks SET status = 'todo' WHERE status IN ('blocked','cancelled')");

        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check');
            DB::statement("ALTER TABLE tasks ADD CONSTRAINT tasks_status_check CHECK (status IN ('todo','in_progress','done'))");
            DB::statement("ALTER TABLE tasks ALTER COLUMN status SET DEFAULT 'todo'");
            DB::statement('ALTER TABLE tasks ALTER COLUMN status SET NOT NULL');
            return;
        }

        DB::statement("ALTER TABLE tasks MODIFY COLUMN status ENUM('todo','in_progress','done') NOT NULL DEFAULT 'todo'");
    }
};
