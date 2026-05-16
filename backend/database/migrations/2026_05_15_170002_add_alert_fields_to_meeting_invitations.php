<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('meeting_invitations', function (Blueprint $table) {
            $table->string('alert_type', 60)->nullable()->after('notes');
            $table->string('alert_message', 500)->nullable()->after('alert_type');
        });
    }

    public function down(): void
    {
        Schema::table('meeting_invitations', function (Blueprint $table) {
            $table->dropColumn(['alert_type', 'alert_message']);
        });
    }
};
