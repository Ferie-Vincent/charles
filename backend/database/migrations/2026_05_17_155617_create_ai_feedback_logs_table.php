<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ai_feedback_logs', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id');
            $table->unsignedBigInteger('company_id');
            $table->string('feature', 100); // 'briefing', 'material_suggestion', 'rag', 'situation', etc.
            $table->unsignedBigInteger('project_id')->nullable();
            $table->enum('rating', ['positive', 'negative']);
            $table->text('comment')->nullable();
            $table->json('ai_output_excerpt')->nullable(); // snapshot of what the AI said
            $table->string('model_used', 100)->nullable(); // 'mistral-small-latest', etc.
            $table->timestamps();

            $table->index(['company_id', 'feature']);
            $table->index(['user_id']);
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            $table->foreign('company_id')->references('id')->on('companies')->onDelete('cascade');
            $table->foreign('project_id')->references('id')->on('projects')->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_feedback_logs');
    }
};
