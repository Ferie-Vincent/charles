<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('avenants', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained()->cascadeOnDelete();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('created_by')->constrained('users');
            $table->string('numero', 20)->unique();
            $table->string('objet', 255)->nullable();
            $table->enum('type', ['montant', 'delai', 'montant_et_delai'])->default('montant');
            $table->decimal('montant_ht', 12, 2)->default(0);
            $table->integer('delai_supplementaire_jours')->nullable();
            $table->enum('status', ['brouillon', 'soumis', 'signe', 'refuse'])->default('brouillon');
            $table->date('date_signature')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->index('project_id');
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('avenants');
    }
};
