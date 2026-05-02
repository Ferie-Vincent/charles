<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('general_expenses', function (Blueprint $table) {
            $table->enum('status', ['en_attente', 'approuvee', 'rejetee'])->default('en_attente')->after('notes');
            $table->foreignId('approver_id')->nullable()->constrained('users')->nullOnDelete()->after('status');
            $table->timestamp('approved_at')->nullable()->after('approver_id');
            $table->string('rejection_reason')->nullable()->after('approved_at');
        });
    }

    public function down(): void
    {
        Schema::table('general_expenses', function (Blueprint $table) {
            $table->dropForeign(['approver_id']);
            $table->dropColumn(['status', 'approver_id', 'approved_at', 'rejection_reason']);
        });
    }
};
