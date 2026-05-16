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
            $table->string('numero')->unique();
            $table->text('description');
            $table->enum('type', ['modification', 'ralentissement', 'suspension', 'reprise', 'arret_travaux', 'autre']);
            $table->date('date_emission');
            $table->date('date_effet');
            $table->date('date_fin')->nullable();
            $table->decimal('impact_cout_ht', 12, 2)->nullable();
            $table->decimal('impact_delai_jours', 10, 2)->nullable();
            $table->text('raison')->nullable();
            $table->enum('status', ['emis', 'accuse_reception', 'execute', 'cloture'])->default('emis');
            $table->foreignId('emis_par')->constrained('users');
            $table->foreignId('recu_par')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('date_accuse')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->index('project_id');
            $table->index('status');
            $table->index('type');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ordres_de_service');
    }
};
