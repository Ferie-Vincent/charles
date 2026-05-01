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
        Schema::create('daily_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->restrictOnDelete();
            $table->date('log_date');
            $table->enum('weather', ['Soleil', 'Nuageux', 'Pluie', 'Orage', 'Vent fort', 'Autre']);
            $table->unsignedSmallInteger('workers_count');
            $table->decimal('progress_percent', 5, 2);
            $table->boolean('has_incident')->default(false);
            $table->enum('incident_type', ['Retard', 'Accident', 'Litige', 'Rupture stock', 'Panne', 'RAS', 'Autre'])->nullable();
            $table->enum('equipment_status', ['Bon', 'Moyen', 'Mauvais', 'Hors service'])->nullable();
            $table->json('materials_received')->nullable();
            $table->timestamps();

            $table->unique(['project_id', 'log_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('daily_logs');
    }
};
