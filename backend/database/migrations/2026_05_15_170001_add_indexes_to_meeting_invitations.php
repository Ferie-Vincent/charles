<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('meeting_invitations', function (Blueprint $table) {
            $table->index(['project_id', 'scheduled_at']);
            $table->index('organized_by');
            $table->index(['company_id', 'scheduled_at']);
        });

        Schema::table('meeting_invitation_users', function (Blueprint $table) {
            $table->uuid('rsvp_token')->nullable()->unique()->after('status');
        });
    }

    public function down(): void
    {
        Schema::table('meeting_invitations', function (Blueprint $table) {
            $table->dropIndex(['project_id', 'scheduled_at']);
            $table->dropIndex(['organized_by']);
            $table->dropIndex(['company_id', 'scheduled_at']);
        });

        Schema::table('meeting_invitation_users', function (Blueprint $table) {
            $table->dropColumn('rsvp_token');
        });
    }
};
