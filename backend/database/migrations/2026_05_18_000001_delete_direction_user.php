<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $userIds = DB::table('users')
            ->where('email', 'direction@charles.ci')
            ->pluck('id')
            ->all();

        if (!empty($userIds)) {
            DB::table('daily_logs')->whereIn('user_id', $userIds)->delete();
            DB::table('users')->whereIn('id', $userIds)->delete();
        }
    }

    public function down(): void
    {
        // no-op
    }
};
