<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('ordres_de_service', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained()->cascadeOnDelete();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('emis_par')->constrained('users');
            $table->string('numero', 20)->unique();
            $table->enum('type', ['demarrage', 'travaux_supplementaires', 'arret', 'reprise', 'autre']);
            $table->string('objet', 255);
            $table->date('date_os');
            $table->integer('delai_impact_jours')->nullable();
            $table->text('description')->nullable();
            $table->string('document_path')->nullable();
            $table->boolean('accuse_reception')->default(false);
            $table->date('date_accuse')->nullable();
            $table->timestamps();
            $table->index('project_id');
            $table->index('type');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ordres_de_service');
    }
};
