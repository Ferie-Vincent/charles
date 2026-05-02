<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('purchase_orders', function (Blueprint $table) {
            $table->string('delivery_note_path')->nullable()->after('notes');
            $table->json('delivery_photos')->nullable()->after('delivery_note_path');
            $table->string('reception_notes', 1000)->nullable()->after('delivery_photos');
            $table->timestamp('received_at')->nullable()->after('reception_notes');
        });
    }

    public function down(): void
    {
        Schema::table('purchase_orders', function (Blueprint $table) {
            $table->dropColumn(['delivery_note_path', 'delivery_photos', 'reception_notes', 'received_at']);
        });
    }
};
