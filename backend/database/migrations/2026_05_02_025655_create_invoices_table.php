<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('invoices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained()->cascadeOnDelete();
            $table->foreignId('supplier_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('created_by')->constrained('users');
            $table->string('reference');
            $table->string('category'); // Matériaux, Main d'œuvre, Sous-traitance…
            $table->decimal('amount_ht', 15, 2);
            $table->decimal('amount_ttc', 15, 2)->nullable();
            $table->enum('status', ['brouillon', 'soumise', 'validee', 'payee', 'disputee'])->default('brouillon');
            $table->date('invoice_date');
            $table->date('due_date')->nullable();
            $table->date('paid_date')->nullable();
            $table->text('note')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('invoices');
    }
};
