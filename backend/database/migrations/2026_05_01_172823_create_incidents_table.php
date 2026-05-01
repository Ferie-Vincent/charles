<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('incidents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained()->cascadeOnDelete();
            $table->foreignId('reported_by')->constrained('users');
            $table->string('type'); // Retard, Accident, Litige, Rupture stock, Panne, Autre
            $table->enum('severity', ['mineur', 'majeur', 'critique'])->default('mineur');
            $table->text('description');
            $table->string('location')->nullable();
            $table->text('corrective_action')->nullable();
            $table->text('witnesses')->nullable();
            $table->enum('status', ['ouvert', 'en_cours', 'resolu', 'ferme'])->default('ouvert');
            $table->timestamp('occurred_at');
            $table->timestamp('resolved_at')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('incidents');
    }
};
