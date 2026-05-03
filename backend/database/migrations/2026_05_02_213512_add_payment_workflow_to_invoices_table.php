<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->unsignedBigInteger('validated_by')->nullable()->after('created_by');
            $table->timestamp('validated_at')->nullable()->after('validated_by');
            $table->unsignedBigInteger('paid_by')->nullable()->after('validated_at');
            $table->timestamp('paid_at')->nullable()->after('paid_by');
            $table->string('payment_proof_path')->nullable()->after('paid_at');
            $table->string('payment_proof_name')->nullable()->after('payment_proof_path');

            $table->foreign('validated_by')->references('id')->on('users')->nullOnDelete();
            $table->foreign('paid_by')->references('id')->on('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->dropForeign(['validated_by']);
            $table->dropForeign(['paid_by']);
            $table->dropColumn([
                'validated_by', 'validated_at',
                'paid_by', 'paid_at',
                'payment_proof_path', 'payment_proof_name',
            ]);
        });
    }
};
