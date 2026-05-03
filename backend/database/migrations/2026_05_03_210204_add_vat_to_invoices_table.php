<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->unsignedTinyInteger('vat_rate')->default(18)->after('amount_ttc');  // TVA CI = 18 %
            $table->decimal('vat_amount', 15, 2)->nullable()->after('vat_rate');
            $table->char('currency', 3)->default('XOF')->after('vat_amount');
        });
    }

    public function down(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->dropColumn(['vat_rate', 'vat_amount', 'currency']);
        });
    }
};
