<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE ged_documents DROP CONSTRAINT IF EXISTS ged_documents_type_check');
            DB::statement("ALTER TABLE ged_documents ADD CONSTRAINT ged_documents_type_check CHECK (type IN ('plan','contrat','pv','rapport','facture','photo','autre','ao','os','marche','bl'))");
            DB::statement("ALTER TABLE ged_documents ALTER COLUMN type SET DEFAULT 'autre'");
            DB::statement('ALTER TABLE ged_documents ALTER COLUMN type SET NOT NULL');
            return;
        }

        DB::statement("ALTER TABLE ged_documents MODIFY COLUMN type ENUM(
            'plan','contrat','pv','rapport','facture','photo','autre','ao','os','marche','bl'
        ) NOT NULL DEFAULT 'autre'");
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::statement("UPDATE ged_documents SET type = 'autre' WHERE type = 'bl'");
            DB::statement('ALTER TABLE ged_documents DROP CONSTRAINT IF EXISTS ged_documents_type_check');
            DB::statement("ALTER TABLE ged_documents ADD CONSTRAINT ged_documents_type_check CHECK (type IN ('plan','contrat','pv','rapport','facture','photo','autre','ao','os','marche'))");
            DB::statement("ALTER TABLE ged_documents ALTER COLUMN type SET DEFAULT 'autre'");
            DB::statement('ALTER TABLE ged_documents ALTER COLUMN type SET NOT NULL');
            return;
        }

        DB::statement("ALTER TABLE ged_documents MODIFY COLUMN type ENUM(
            'plan','contrat','pv','rapport','facture','photo','autre','ao','os','marche'
        ) NOT NULL DEFAULT 'autre'");
    }
};
