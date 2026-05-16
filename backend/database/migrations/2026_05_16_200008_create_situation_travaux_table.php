<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('situation_travaux', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained()->cascadeOnDelete();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('dqe_version_id')->nullable()->constrained('dqe_versions')->nullOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('validated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('paid_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('numero');
            $table->string('periode');
            $table->decimal('avancement_pct', 5, 2);
            $table->decimal('montant_brut_ht', 15, 2);
            $table->decimal('cumul_precedent_ht', 15, 2)->default(0);
            $table->decimal('retenue_garantie_pct', 5, 2)->default(5.00);
            $table->decimal('retenue_garantie_amount', 15, 2)->default(0);
            $table->decimal('avance_remboursement', 15, 2)->default(0);
            $table->decimal('vat_rate', 5, 2)->default(18.00);
            $table->decimal('vat_amount', 15, 2)->default(0);
            $table->decimal('net_a_payer', 15, 2);
            $table->enum('status', ['brouillon', 'soumise', 'validee_moe', 'payee'])->default('brouillon');
            $table->timestamp('submitted_at')->nullable();
            $table->timestamp('validated_at')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->date('date_paiement')->nullable();
            $table->json('detail_lots')->nullable();
            $table->longText('rapport_ia')->nullable();
            $table->unsignedBigInteger('ged_document_id')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->unique(['project_id', 'numero']);
            $table->index(['project_id', 'status']);
            $table->index(['project_id', 'periode']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('situation_travaux');
    }
};
