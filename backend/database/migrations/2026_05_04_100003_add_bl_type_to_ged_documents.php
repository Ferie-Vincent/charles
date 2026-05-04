<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE ged_documents MODIFY COLUMN type ENUM(
            'plan','contrat','pv','rapport','facture','photo','autre','ao','os','marche','bl'
        ) NOT NULL DEFAULT 'autre'");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE ged_documents MODIFY COLUMN type ENUM(
            'plan','contrat','pv','rapport','facture','photo','autre','ao','os','marche'
        ) NOT NULL DEFAULT 'autre'");
    }
};
