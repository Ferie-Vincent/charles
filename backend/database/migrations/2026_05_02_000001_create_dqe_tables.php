<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('dqe_versions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained()->cascadeOnDelete();
            $table->foreignId('created_by')->constrained('users');
            $table->unsignedSmallInteger('version_number')->default(1);
            $table->string('name');
            $table->enum('status', ['draft', 'validated', 'archived'])->default('draft');
            $table->decimal('total_ht', 15, 2)->default(0);
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->unique(['project_id', 'version_number']);
        });

        Schema::create('dqe_lines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('dqe_version_id')->constrained()->cascadeOnDelete();
            $table->string('lot');
            $table->string('ouvrage');
            $table->string('unite', 20);
            $table->decimal('quantite', 12, 3)->default(0);
            $table->decimal('prix_unitaire', 15, 2)->default(0);
            $table->decimal('montant_ht', 15, 2)->default(0);
            $table->unsignedSmallInteger('ordre')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('dqe_lines');
        Schema::dropIfExists('dqe_versions');
    }
};
