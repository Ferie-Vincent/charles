<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('bpu_versions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained()->cascadeOnDelete();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->integer('version_number')->default(1);
            $table->enum('status', ['draft', 'validated', 'archived'])->default('draft');
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->index(['project_id', 'status']);
        });

        Schema::create('bpu_lines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('bpu_version_id')->constrained()->cascadeOnDelete();
            $table->string('lot');
            $table->string('designation');
            $table->string('unite');
            $table->decimal('prix_unitaire', 15, 2);
            $table->integer('ordre')->default(0);
            $table->timestamps();
            $table->index(['bpu_version_id', 'lot']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bpu_lines');
        Schema::dropIfExists('bpu_versions');
    }
};
