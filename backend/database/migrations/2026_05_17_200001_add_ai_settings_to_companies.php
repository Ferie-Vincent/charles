<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('companies', function (Blueprint $table) {
            $table->boolean('ai_enabled')->default(true)->after('slug');
            $table->enum('ai_provider', ['mistral', 'groq', 'anthropic'])->nullable()->after('ai_enabled');
            $table->text('ai_api_key')->nullable()->after('ai_provider');
        });
    }

    public function down(): void
    {
        Schema::table('companies', function (Blueprint $table) {
            $table->dropColumn(['ai_enabled', 'ai_provider', 'ai_api_key']);
        });
    }
};
