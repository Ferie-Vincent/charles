<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('decomptes_generaux_definitifs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->unique()->constrained()->cascadeOnDelete();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('signed_by_moa')->nullable()->constrained('users')->nullOnDelete();
            $table->decimal('montant_marche_initial', 15, 2);
            $table->decimal('montant_avenants', 15, 2)->default(0);
            $table->decimal('montant_marche_final', 15, 2);
            $table->decimal('total_situations_ht', 15, 2)->default(0);
            $table->decimal('penalites_retard', 15, 2)->default(0);
            $table->decimal('retenue_garantie_liberee', 15, 2)->default(0);
            $table->decimal('solde_final', 15, 2);
            $table->enum('status', ['brouillon', 'soumis', 'signe_entreprise', 'signe_moa'])->default('brouillon');
            $table->timestamp('submitted_at')->nullable();
            $table->timestamp('signed_by_contractor_at')->nullable();
            $table->timestamp('signed_by_moa_at')->nullable();
            $table->text('observations')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('decomptes_generaux_definitifs');
    }
};
