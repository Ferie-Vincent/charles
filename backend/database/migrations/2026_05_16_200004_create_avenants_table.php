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
            $table->string('numero')->unique();
            $table->enum('type', ['extension_delai', 'augmentation_cout', 'reduction_cout', 'modification_travaux', 'autre']);
            $table->decimal('montant_ht', 12, 2)->nullable();
            $table->decimal('montant_tva', 12, 2)->nullable();
            $table->decimal('montant_ttc', 12, 2)->nullable();
            $table->text('description')->nullable();
            $table->date('date_demande');
            $table->date('date_acceptation')->nullable();
            $table->enum('status', ['en_attente', 'accepte', 'rejete'])->default('en_attente');
            $table->foreignId('created_by')->constrained('users');
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('notes_approbation')->nullable();
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
