<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("UPDATE projects SET status = 'en_preparation' WHERE status = 'draft'");
    }

    public function down(): void
    {
        DB::statement("UPDATE projects SET status = 'draft' WHERE status = 'en_preparation'");
    }
};
