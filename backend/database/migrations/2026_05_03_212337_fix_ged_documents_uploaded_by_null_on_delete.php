<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // ged_documents.uploaded_by — cascadeOnDelete → nullOnDelete (make nullable)
        Schema::table('ged_documents', function (Blueprint $table) {
            $table->dropForeign('ged_documents_uploaded_by_foreign');
            $table->unsignedBigInteger('uploaded_by')->nullable()->change();
            $table->foreign('uploaded_by')->references('id')->on('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('ged_documents', function (Blueprint $table) {
            $table->dropForeign(['uploaded_by']);
            $table->unsignedBigInteger('uploaded_by')->nullable(false)->change();
            $table->foreign('uploaded_by')->references('id')->on('users')->cascadeOnDelete();
        });
    }
};
