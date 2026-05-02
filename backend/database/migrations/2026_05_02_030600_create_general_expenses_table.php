<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('general_expenses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('created_by')->constrained('users');
            $table->enum('category', [
                'transport', 'hebergement', 'restauration',
                'fournitures', 'communication', 'salaires',
                'charges', 'autre',
            ]);
            $table->string('label');
            $table->decimal('amount', 15, 2);
            $table->date('expense_date');
            $table->string('paid_by')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('general_expenses');
    }
};
