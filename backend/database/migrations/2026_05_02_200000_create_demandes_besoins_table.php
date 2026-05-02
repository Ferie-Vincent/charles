<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('demandes_besoins', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete();
            $table->foreignId('project_id')->constrained('projects')->cascadeOnDelete();
            $table->foreignId('requested_by')->constrained('users');
            $table->string('title');
            $table->text('description')->nullable();
            $table->enum('category', ['materiaux', 'equipement', 'sous-traitance', 'main-oeuvre', 'autre'])->default('materiaux');
            $table->decimal('quantity', 10, 2)->nullable();
            $table->string('unit')->nullable();
            $table->decimal('estimated_cost', 15, 2)->nullable();
            $table->enum('urgency', ['normal', 'urgent', 'critique'])->default('normal');
            $table->enum('status', ['soumis', 'approuve', 'rejete', 'en_preparation', 'livre', 'comptabilise'])->default('soumis');
            $table->foreignId('approved_by')->nullable()->constrained('users');
            $table->timestamp('approved_at')->nullable();
            $table->text('rejection_reason')->nullable();
            $table->foreignId('prepared_by')->nullable()->constrained('users');
            $table->timestamp('prepared_at')->nullable();
            $table->timestamp('delivered_at')->nullable();
            $table->decimal('actual_cost', 15, 2)->nullable();
            $table->foreignId('recorded_by')->nullable()->constrained('users');
            $table->timestamp('recorded_at')->nullable();
            $table->foreignId('budget_entry_id')->nullable()->constrained('budget_entries')->nullOnDelete();
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('demandes_besoins');
    }
};
