<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        $old = 'direction@charles.ci';
        $new = 'direction-deleted@charles.ci';

        $count = DB::table('users')->where('email', $old)->count();

        if ($count > 0) {
            DB::table('users')
                ->where('email', $old)
                ->update([
                    'email' => $new . '-' . (string) Str::uuid(),
                ]);
        }
    }

    public function down(): void
    {
        // noop
    }
};
