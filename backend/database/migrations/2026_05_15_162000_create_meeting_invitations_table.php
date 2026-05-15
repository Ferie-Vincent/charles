<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('meeting_invitations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('project_id')->constrained()->cascadeOnDelete();
            $table->foreignId('task_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('organized_by')->constrained('users')->cascadeOnDelete();
            $table->string('title');
            $table->timestamp('scheduled_at');
            $table->string('location')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        Schema::create('meeting_invitation_users', function (Blueprint $table) {
            $table->id();
            $table->foreignId('meeting_invitation_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->enum('status', ['invited', 'accepted', 'declined'])->default('invited');
            $table->timestamps();

            $table->unique(['meeting_invitation_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('meeting_invitation_users');
        Schema::dropIfExists('meeting_invitations');
    }
};
