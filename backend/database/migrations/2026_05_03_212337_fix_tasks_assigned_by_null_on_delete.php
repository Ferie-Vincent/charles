<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // tasks.assigned_by — cascadeOnDelete → nullOnDelete (make nullable)
        Schema::table('tasks', function (Blueprint $table) {
            $table->dropForeign('tasks_assigned_by_foreign');
            $table->unsignedBigInteger('assigned_by')->nullable()->change();
            $table->foreign('assigned_by')->references('id')->on('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('tasks', function (Blueprint $table) {
            $table->dropForeign(['assigned_by']);
            $table->unsignedBigInteger('assigned_by')->nullable(false)->change();
            $table->foreign('assigned_by')->references('id')->on('users')->cascadeOnDelete();
        });
    }
};
