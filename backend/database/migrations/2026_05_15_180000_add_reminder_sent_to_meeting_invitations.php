<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('meeting_invitations', function (Blueprint $table) {
            $table->boolean('reminder_sent')->default(false)->after('notes');
        });
    }

    public function down(): void
    {
        Schema::table('meeting_invitations', function (Blueprint $table) {
            $table->dropColumn('reminder_sent');
        });
    }
};
