<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('users')->where('email', 'direction@charles.ci')->delete();
    }

    public function down(): void
    {
        // no-op
    }
};
