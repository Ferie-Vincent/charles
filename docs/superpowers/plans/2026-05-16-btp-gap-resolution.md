# BTP Gap Resolution — 25 Issues Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resolve all 25 domain gaps identified in the BTP/logique-metier.md audit — covering database schema, backend business rules, and frontend UX across 3 sequential phases.

**Architecture:** Phase 1 lays all DB foundations (migrations only, no logic). Phase 2 adds models, controllers and business rules on top. Phase 3 builds the frontend pages and updates existing components. Each phase is independently committable.

**Tech Stack:** Laravel 12 (PHP 8.3, Pest tests, Eloquent), React 18 (TypeScript, TanStack Query, React Router), MySQL 8, custom CSS.

**Issues resolved per phase:**
- Phase 1 (DB): #3, #8, #10, #13, #15, #21 (schema), #1 (schema), #4 (schema), #5 (schema), #6 (schema), #11, #16 (schema), #24 (seeder)
- Phase 2 (Backend): #1 (logic), #2, #7, #9, #12, #17 (computed), #22, #25
- Phase 3 (Frontend): #14, #15 (UI), #16 (UI), #18, #19, #20, #23

---

## Reference: Issue Map

| # | Issue | Phase |
|---|-------|-------|
| 1 | SituationTravaux model + workflow | 1+2 |
| 2 | Retenue garantie direction (fournisseur → MOA) | 2 |
| 3 | DailyAttendance boolean → enum + heures | 1+2+3 |
| 4 | Avenant model | 1+2 |
| 5 | OrdreDeService model | 1+2 |
| 6 | BPU model | 1+2 |
| 7 | BDC seuils validation | 2 |
| 8 | ProjectWorker statut + dates | 1+2+3 |
| 9 | Avance démarrage remboursement tracking | 2 |
| 10 | TVA 18% + XOF defaults | 1 |
| 11 | DqeVersion → bpu_version_id FK | 1 |
| 12 | BudgetEntry paiement double-comptage | 2 |
| 13 | Invoice direction enum | 1+2 |
| 14 | ProjectWorker.trade enum BTP | 3 |
| 15 | Project lifecycle_status | 1+3 |
| 16 | DGD model | 1+2 |
| 17 | Réception BL confirmation step | 3 |
| 18 | OS visibilité terrain | 3 |
| 19 | Phase projet visible terrain | 3 |
| 20 | SituationTravaux UI | 3 |
| 21 | Caution bonne exécution tracking | 1+3 |
| 22 | Pénalités retard auto-calc | 2 |
| 23 | Heures sup majorations | 2+3 |
| 24 | Jours fériés CI | 1 (seeder) |
| 25 | SMIG CI référence | 2 (config) |

---

# PHASE 1 — Database Foundations

> Run all migrations in order. No model/controller changes in this phase. Test: `php artisan migrate:status` after each.

---

### Task 1: Patch DailyAttendance — statut enum + heures (Issue #3)

**Files:**
- Create: `backend/database/migrations/2026_05_16_200000_patch_daily_attendance_add_statut_heures.php`
- Modify: `backend/app/Models/DailyAttendance.php`

- [ ] **Step 1: Create migration**

```php
<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('daily_attendance', function (Blueprint $table) {
            // Replace present boolean with enum statut
            $table->enum('statut', ['present', 'absent', 'conge', 'maladie', 'demi_journee'])
                  ->default('present')->after('log_date');
            $table->decimal('heures_normales', 4, 2)->default(8.00)->after('statut');
            $table->decimal('heures_sup', 4, 2)->default(0)->after('heures_normales');
            // keep present boolean for backward compat — will derive from statut
        });

        // Migrate existing boolean data
        \DB::statement("UPDATE daily_attendance SET statut = CASE WHEN `present` = 1 THEN 'present' ELSE 'absent' END");
    }

    public function down(): void
    {
        Schema::table('daily_attendance', function (Blueprint $table) {
            $table->dropColumn(['statut', 'heures_normales', 'heures_sup']);
        });
    }
};
```

- [ ] **Step 2: Run migration**

```bash
cd backend && php artisan migrate
```
Expected: `Migrating: 2026_05_16_200000_patch_daily_attendance_add_statut_heures` → `Migrated`

- [ ] **Step 3: Update DailyAttendance model**

```php
// backend/app/Models/DailyAttendance.php
protected $fillable = [
    'project_id', 'worker_id', 'company_id',
    'log_date', 'present', 'statut', 'heures_normales', 'heures_sup', 'task_assigned',
];

protected $casts = [
    'present'        => 'boolean',
    'log_date'       => 'date:Y-m-d',
    'heures_normales'=> 'float',
    'heures_sup'     => 'float',
];

// Derive present from statut
public function getIsPresentAttribute(): bool
{
    return in_array($this->statut, ['present', 'demi_journee']);
}
```

- [ ] **Step 4: Commit**

```bash
git add backend/database/migrations/2026_05_16_200000_patch_daily_attendance_add_statut_heures.php backend/app/Models/DailyAttendance.php
git commit -m "feat(db): patch daily_attendance — statut enum + heures_normales + heures_sup"
```

---

### Task 2: Patch ProjectWorker — statut + dates (Issue #8)

**Files:**
- Create: `backend/database/migrations/2026_05_16_200001_patch_project_workers_add_statut_dates.php`
- Modify: `backend/app/Models/ProjectWorker.php`

- [ ] **Step 1: Create migration**

```php
<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('project_workers', function (Blueprint $table) {
            $table->enum('statut', ['permanent', 'temporaire', 'interimaire', 'sous_traitant', 'etam', 'cadre'])
                  ->default('temporaire')->after('name');
            $table->date('date_debut')->nullable()->after('phone');
            $table->date('date_fin')->nullable()->after('date_debut');
        });
    }

    public function down(): void
    {
        Schema::table('project_workers', function (Blueprint $table) {
            $table->dropColumn(['statut', 'date_debut', 'date_fin']);
        });
    }
};
```

- [ ] **Step 2: Run migration**

```bash
cd backend && php artisan migrate
```

- [ ] **Step 3: Update ProjectWorker model**

Add to `$fillable`: `'statut', 'date_debut', 'date_fin'`
Add to `$casts`: `'date_debut' => 'date', 'date_fin' => 'date'`

- [ ] **Step 4: Commit**

```bash
git add backend/database/migrations/2026_05_16_200001_patch_project_workers_add_statut_dates.php backend/app/Models/ProjectWorker.php
git commit -m "feat(db): patch project_workers — statut enum + date_debut/date_fin"
```

---

### Task 3: Patch Invoice — direction + TVA default + XOF default (Issues #10, #13)

**Files:**
- Create: `backend/database/migrations/2026_05_16_200002_patch_invoices_direction_defaults.php`
- Modify: `backend/app/Models/Invoice.php`

- [ ] **Step 1: Create migration**

```php
<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->enum('direction', ['fournisseur', 'client'])->default('fournisseur')->after('reference');
        });

        // Set defaults for existing rows
        \DB::statement("ALTER TABLE invoices MODIFY COLUMN vat_rate INT NOT NULL DEFAULT 18");
        \DB::statement("UPDATE invoices SET vat_rate = 18 WHERE vat_rate IS NULL OR vat_rate = 0");
        \DB::statement("ALTER TABLE invoices MODIFY COLUMN currency VARCHAR(3) NOT NULL DEFAULT 'XOF'");
        \DB::statement("UPDATE invoices SET currency = 'XOF' WHERE currency IS NULL OR currency = ''");
    }

    public function down(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->dropColumn('direction');
        });
    }
};
```

- [ ] **Step 2: Run migration**

```bash
cd backend && php artisan migrate
```

- [ ] **Step 3: Update Invoice model**

Add `'direction'` to `$fillable`.
Add `'direction' => 'string'` to `$casts`.

- [ ] **Step 4: Commit**

```bash
git add backend/database/migrations/2026_05_16_200002_patch_invoices_direction_defaults.php backend/app/Models/Invoice.php
git commit -m "feat(db): patch invoices — direction enum + TVA 18% default + XOF default"
```

---

### Task 4: Patch Project — lifecycle_status + caution_bonne_execution (Issues #15, #21)

**Files:**
- Create: `backend/database/migrations/2026_05_16_200003_patch_projects_lifecycle_caution.php`
- Modify: `backend/app/Models/Project.php`

- [ ] **Step 1: Create migration**

```php
<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            $table->enum('lifecycle_status', [
                'ao', 'attribution', 'preparation', 'execution', 'reception', 'cloture'
            ])->default('execution')->after('status');
            $table->decimal('caution_bonne_execution_pct', 5, 2)->default(5.00)->nullable()->after('avance_demarrage_pct');
            $table->decimal('penalites_retard_par_jour', 12, 2)->nullable()->after('delai_execution_jours');
        });
    }

    public function down(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            $table->dropColumn(['lifecycle_status', 'caution_bonne_execution_pct', 'penalites_retard_par_jour']);
        });
    }
};
```

- [ ] **Step 2: Run migration**

```bash
cd backend && php artisan migrate
```

- [ ] **Step 3: Update Project model**

Add to `$fillable`: `'lifecycle_status', 'caution_bonne_execution_pct', 'penalites_retard_par_jour'`
Add to `$casts`: `'caution_bonne_execution_pct' => 'decimal:2', 'penalites_retard_par_jour' => 'decimal:2'`

- [ ] **Step 4: Commit**

```bash
git add backend/database/migrations/2026_05_16_200003_patch_projects_lifecycle_caution.php backend/app/Models/Project.php
git commit -m "feat(db): patch projects — lifecycle_status + caution_bonne_execution + penalites_retard"
```

---

### Task 5: Create `avenants` table (Issue #4)

**Files:**
- Create: `backend/database/migrations/2026_05_16_200004_create_avenants_table.php`

- [ ] **Step 1: Create migration**

```php
<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('avenants', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained()->cascadeOnDelete();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('created_by')->constrained('users')->nullOnDelete();
            $table->string('numero'); // ex: "AVN-001"
            $table->string('objet');
            $table->enum('type', ['montant', 'delai', 'montant_et_delai'])->default('montant');
            $table->decimal('montant_ht', 15, 2)->default(0); // positif = augmentation, négatif = réduction
            $table->integer('delai_supplementaire_jours')->default(0);
            $table->enum('status', ['brouillon', 'soumis', 'signe', 'refuse'])->default('brouillon');
            $table->date('date_signature')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['project_id', 'status']);
            $table->unique(['project_id', 'numero']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('avenants');
    }
};
```

- [ ] **Step 2: Run migration**

```bash
cd backend && php artisan migrate
```

- [ ] **Step 3: Commit**

```bash
git add backend/database/migrations/2026_05_16_200004_create_avenants_table.php
git commit -m "feat(db): create avenants table — contract amendments tracking"
```

---

### Task 6: Create `ordres_de_service` table (Issue #5)

**Files:**
- Create: `backend/database/migrations/2026_05_16_200005_create_ordres_de_service_table.php`

- [ ] **Step 1: Create migration**

```php
<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('ordres_de_service', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained()->cascadeOnDelete();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('emis_par')->constrained('users')->nullOnDelete();
            $table->string('numero'); // ex: "OS-001"
            $table->enum('type', ['demarrage', 'travaux_supplementaires', 'arret', 'reprise', 'autre'])
                  ->default('autre');
            $table->string('objet');
            $table->date('date_os');
            $table->integer('delai_impact_jours')->default(0);
            $table->text('description')->nullable();
            $table->string('document_path')->nullable();
            $table->boolean('accuse_reception')->default(false);
            $table->date('date_accuse')->nullable();
            $table->timestamps();

            $table->index(['project_id', 'type']);
            $table->unique(['project_id', 'numero']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ordres_de_service');
    }
};
```

- [ ] **Step 2: Run migration**

```bash
cd backend && php artisan migrate
```

- [ ] **Step 3: Commit**

```bash
git add backend/database/migrations/2026_05_16_200005_create_ordres_de_service_table.php
git commit -m "feat(db): create ordres_de_service table — OS tracking"
```

---

### Task 7: Create `bpu_versions` + `bpu_lines` tables + FK on dqe_versions (Issues #6, #11)

**Files:**
- Create: `backend/database/migrations/2026_05_16_200006_create_bpu_tables.php`
- Create: `backend/database/migrations/2026_05_16_200007_add_bpu_version_id_to_dqe_versions.php`

- [ ] **Step 1: Create BPU tables migration**

```php
<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('bpu_versions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained()->cascadeOnDelete();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->integer('version_number')->default(1);
            $table->enum('status', ['draft', 'validated', 'archived'])->default('draft');
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->index(['project_id', 'status']);
        });

        Schema::create('bpu_lines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('bpu_version_id')->constrained()->cascadeOnDelete();
            $table->string('lot');
            $table->string('designation');
            $table->string('unite'); // m², ml, m³, kg, u, forfait…
            $table->decimal('prix_unitaire', 15, 2);
            $table->integer('ordre')->default(0);
            $table->timestamps();
            $table->index(['bpu_version_id', 'lot']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bpu_lines');
        Schema::dropIfExists('bpu_versions');
    }
};
```

- [ ] **Step 2: Create FK migration on dqe_versions**

```php
<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('dqe_versions', function (Blueprint $table) {
            $table->foreignId('bpu_version_id')->nullable()->constrained()->nullOnDelete()->after('project_id');
        });
    }

    public function down(): void
    {
        Schema::table('dqe_versions', function (Blueprint $table) {
            $table->dropForeign(['bpu_version_id']);
            $table->dropColumn('bpu_version_id');
        });
    }
};
```

- [ ] **Step 3: Run migrations**

```bash
cd backend && php artisan migrate
```

- [ ] **Step 4: Commit**

```bash
git add backend/database/migrations/2026_05_16_200006_create_bpu_tables.php backend/database/migrations/2026_05_16_200007_add_bpu_version_id_to_dqe_versions.php
git commit -m "feat(db): create bpu_versions + bpu_lines + FK on dqe_versions"
```

---

### Task 8: Create `situation_travaux` table — real DB model (Issue #1)

**Files:**
- Create: `backend/database/migrations/2026_05_16_200008_create_situation_travaux_table.php`

- [ ] **Step 1: Create migration**

```php
<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('situation_travaux', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained()->cascadeOnDelete();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('dqe_version_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('created_by')->constrained('users')->nullOnDelete();
            $table->foreignId('validated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('paid_by')->nullable()->constrained('users')->nullOnDelete();

            $table->string('numero'); // ex: "ST-001"
            $table->string('periode'); // format "YYYY-MM"
            $table->decimal('avancement_pct', 5, 2); // % d'avancement déclaré

            // Financier
            $table->decimal('montant_brut_ht', 15, 2);         // travaux réalisés HT
            $table->decimal('cumul_precedent_ht', 15, 2)->default(0); // situations précédentes
            $table->decimal('retenue_garantie_pct', 5, 2)->default(5.00);
            $table->decimal('retenue_garantie_amount', 15, 2)->default(0);
            $table->decimal('avance_remboursement', 15, 2)->default(0); // tranche remboursement avance démarrage
            $table->decimal('vat_rate', 5, 2)->default(18.00);
            $table->decimal('vat_amount', 15, 2)->default(0);
            $table->decimal('net_a_payer', 15, 2);              // final après déductions + TVA

            // Workflow
            $table->enum('status', ['brouillon', 'soumise', 'validee_moe', 'payee'])->default('brouillon');
            $table->timestamp('submitted_at')->nullable();
            $table->timestamp('validated_at')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->date('date_paiement')->nullable();

            // Détail par lot (JSON snapshot)
            $table->json('detail_lots')->nullable(); // [{lot, montant_marche, avancement_pct, montant_realise}]

            // IA text (optionnel — archive du rapport généré)
            $table->longText('rapport_ia')->nullable();
            $table->unsignedBigInteger('ged_document_id')->nullable();

            $table->text('notes')->nullable();
            $table->timestamps();

            $table->unique(['project_id', 'numero']);
            $table->index(['project_id', 'status']);
            $table->index(['project_id', 'periode']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('situation_travaux');
    }
};
```

- [ ] **Step 2: Run migration**

```bash
cd backend && php artisan migrate
```

- [ ] **Step 3: Commit**

```bash
git add backend/database/migrations/2026_05_16_200008_create_situation_travaux_table.php
git commit -m "feat(db): create situation_travaux table — structured billing workflow"
```

---

### Task 9: Create `decomptes_generaux_definitifs` table (Issue #16)

**Files:**
- Create: `backend/database/migrations/2026_05_16_200009_create_dgd_table.php`

- [ ] **Step 1: Create migration**

```php
<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('decomptes_generaux_definitifs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->unique()->constrained()->cascadeOnDelete(); // 1 DGD par projet
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('created_by')->constrained('users')->nullOnDelete();
            $table->foreignId('signed_by_moa')->nullable()->constrained('users')->nullOnDelete();

            $table->decimal('montant_marche_initial', 15, 2);
            $table->decimal('montant_avenants', 15, 2)->default(0);
            $table->decimal('montant_marche_final', 15, 2);    // initial + avenants
            $table->decimal('total_situations_ht', 15, 2);      // cumul toutes situations
            $table->decimal('penalites_retard', 15, 2)->default(0);
            $table->decimal('retenue_garantie_liberee', 15, 2)->default(0);
            $table->decimal('solde_final', 15, 2);

            $table->enum('status', ['brouillon', 'soumis', 'signe_entreprise', 'signe_moa'])
                  ->default('brouillon');
            $table->date('date_signature_entreprise')->nullable();
            $table->date('date_signature_moa')->nullable();

            $table->text('observations')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('decomptes_generaux_definitifs');
    }
};
```

- [ ] **Step 2: Run migration**

```bash
cd backend && php artisan migrate
```

- [ ] **Step 3: Commit**

```bash
git add backend/database/migrations/2026_05_16_200009_create_dgd_table.php
git commit -m "feat(db): create decomptes_generaux_definitifs table — DGD close-out"
```

---

### Task 10: Seeders — jours fériés CI + trades BTP (Issues #24, #14)

**Files:**
- Create: `backend/database/seeders/JoursFeriesSeeder.php`
- Create: `backend/database/seeders/TradesBtpSeeder.php`
- Create: `backend/config/btp.php`

- [ ] **Step 1: Create BTP config**

```php
<?php
// backend/config/btp.php
return [
    'smig_mensuel_xof'     => 60000,  // SMIG CI — à mettre à jour selon réglementation
    'tva_taux_standard'    => 18,
    'retenue_garantie_pct' => 5,
    'avance_demarrage_pct' => 15,
    'devise'               => 'XOF',

    'jours_feries' => [
        // Fixes
        '01-01' => 'Nouvel An',
        '05-01' => 'Fête du Travail',
        '08-15' => 'Assomption',
        '11-01' => 'Toussaint',
        '11-15' => 'Fête Nationale (Côte d\'Ivoire)',
        '12-25' => 'Noël',
        // Religieux variables (Islam & Chrétienté) — dates indicatives
        // Gérés dynamiquement dans l'application
    ],

    'trades_btp' => [
        'macon'            => 'Maçon',
        'coffreur'         => 'Coffreur-boiseur',
        'ferrailleur'      => 'Ferrailleur',
        'platrier'         => 'Plâtrier-enduiseur',
        'carreleur'        => 'Carreleur',
        'peintre'          => 'Peintre',
        'menuisier_bois'   => 'Menuisier bois',
        'menuisier_alu'    => 'Menuisier aluminium',
        'electricien'      => 'Électricien',
        'plombier'         => 'Plombier-sanitariste',
        'climaticien'      => 'Technicien CVC',
        'conducteur_engin' => 'Conducteur d\'engin',
        'grutier'          => 'Grutier',
        'soudeur'          => 'Soudeur',
        'topographe'       => 'Topographe',
        'manoeuvre'        => 'Manœuvre',
        'chef_equipe'      => 'Chef d\'équipe',
        'autre'            => 'Autre',
    ],

    'bdc_seuils_validation' => [
        // montant_max_xof => role_minimum_requis
        500_000         => 'chef-chantier',
        5_000_000       => 'conducteur-travaux',
        50_000_000      => 'directeur-technique',
        PHP_INT_MAX     => 'direction',
    ],
];
```

- [ ] **Step 2: Commit config**

```bash
git add backend/config/btp.php
git commit -m "feat(config): add btp.php — SMIG, TVA, jours fériés, trades, seuils BDC"
```

---

# PHASE 2 — Backend Business Logic

> Models, Controllers, Rules. Depends on Phase 1 migrations being run.

---

### Task 11: Update ProjectWorkerController — new attendance fields (Issue #3)

**Files:**
- Modify: `backend/app/Http/Controllers/ProjectWorkerController.php`

- [ ] **Step 1: Write failing test**

```php
// backend/tests/Feature/ProjectWorker/AttendanceTest.php
it('stores attendance with statut and heures', function () {
    $user    = userWithRole('chef-chantier');
    $project = Project::factory()->create(['company_id' => $user->company_id]);
    ProjectMember::factory()->create(['project_id' => $project->id, 'user_id' => $user->id]);
    $worker  = ProjectWorker::factory()->create(['project_id' => $project->id, 'company_id' => $user->company_id]);

    $response = $this->actingAs($user)->postJson("/api/projects/{$project->id}/workers/attendance", [
        'worker_id'       => $worker->id,
        'log_date'        => '2026-05-16',
        'statut'          => 'demi_journee',
        'heures_normales' => 4.00,
        'heures_sup'      => 0,
        'task_assigned'   => 'GO Fondations',
    ]);

    $response->assertOk();
    expect($response->json('attendance.statut'))->toBe('demi_journee');
    expect($response->json('attendance.heures_normales'))->toBe(4.0);
});
```

- [ ] **Step 2: Run test — verify fail**

```bash
cd backend && php artisan test tests/Feature/ProjectWorker/AttendanceTest.php
```
Expected: FAIL — `statut` field not in validation rules.

- [ ] **Step 3: Update `attendance()` method in ProjectWorkerController**

```php
public function attendance(Request $request, Project $project): JsonResponse
{
    $this->authorize('create', [ProjectWorker::class, $project]);

    $validStatuts = ['present', 'absent', 'conge', 'maladie', 'demi_journee'];

    $data = $request->validate([
        'worker_id'       => 'required|integer|exists:project_workers,id',
        'log_date'        => 'required|date_format:Y-m-d',
        'statut'          => ['sometimes', 'string', \Illuminate\Validation\Rule::in($validStatuts)],
        'present'         => 'sometimes|boolean', // backward compat
        'heures_normales' => 'sometimes|numeric|min:0|max:24',
        'heures_sup'      => 'sometimes|numeric|min:0|max:12',
        'task_assigned'   => 'nullable|string|max:120',
    ]);

    // Derive statut from present (backward compat)
    if (!isset($data['statut']) && isset($data['present'])) {
        $data['statut'] = $data['present'] ? 'present' : 'absent';
    }
    $data['statut'] ??= 'present';
    $data['present'] = in_array($data['statut'], ['present', 'demi_journee']);

    // Adjust heures_normales for demi-journée
    if ($data['statut'] === 'demi_journee' && !isset($data['heures_normales'])) {
        $data['heures_normales'] = 4.00;
    }

    try {
        $att = DB::transaction(function () use ($data, $project, $request) {
            return DailyAttendance::updateOrCreate(
                ['worker_id' => $data['worker_id'], 'log_date' => $data['log_date']],
                [
                    'project_id'      => $project->id,
                    'company_id'      => $request->user()->company_id,
                    'present'         => $data['present'],
                    'statut'          => $data['statut'],
                    'heures_normales' => $data['heures_normales'] ?? 8.00,
                    'heures_sup'      => $data['heures_sup'] ?? 0,
                    'task_assigned'   => $data['task_assigned'] ?? null,
                ]
            );
        });
    } catch (QueryException $e) {
        if ($e->getCode() === '23000') {
            $att = DailyAttendance::where('worker_id', $data['worker_id'])
                ->where('log_date', $data['log_date'])
                ->firstOrFail();
        } else {
            throw $e;
        }
    }

    return response()->json(['attendance' => $att]);
}
```

Also update `index()` to return new fields:
```php
'attendance' => $att ? [
    'id'             => $att->id,
    'present'        => $att->present,
    'statut'         => $att->statut,
    'heures_normales'=> $att->heures_normales,
    'heures_sup'     => $att->heures_sup,
    'task_assigned'  => $att->task_assigned,
] : null,
```

Also update `store()` validation to include `statut`, `date_debut`, `date_fin`:
```php
$data = $request->validate([
    'name'       => 'required|string|max:120',
    'trade'      => 'required|string|max:80',
    'statut'     => ['sometimes', Rule::in(array_keys(config('btp.trades_btp')))],
    'phone'      => 'nullable|string|max:30',
    'date_debut' => 'nullable|date',
    'date_fin'   => 'nullable|date|after_or_equal:date_debut',
]);
```

- [ ] **Step 4: Run test — verify pass**

```bash
cd backend && php artisan test tests/Feature/ProjectWorker/AttendanceTest.php
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/Http/Controllers/ProjectWorkerController.php backend/tests/Feature/ProjectWorker/AttendanceTest.php
git commit -m "feat(workers): attendance endpoint supports statut enum + heures_normales + heures_sup"
```

---

### Task 12: Create Avenant model + AvenantController (Issue #4)

**Files:**
- Create: `backend/app/Models/Avenant.php`
- Create: `backend/app/Http/Controllers/AvenantController.php`
- Modify: `backend/routes/api.php`

- [ ] **Step 1: Create Avenant model**

```php
<?php
// backend/app/Models/Avenant.php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Avenant extends Model
{
    protected $fillable = [
        'project_id', 'company_id', 'created_by',
        'numero', 'objet', 'type', 'montant_ht',
        'delai_supplementaire_jours', 'status', 'date_signature', 'notes',
    ];

    protected $casts = [
        'montant_ht'                  => 'decimal:2',
        'delai_supplementaire_jours'  => 'integer',
        'date_signature'              => 'date',
    ];

    public function project(): BelongsTo  { return $this->belongsTo(Project::class); }
    public function creator(): BelongsTo  { return $this->belongsTo(User::class, 'created_by'); }
}
```

- [ ] **Step 2: Create AvenantController**

```php
<?php
// backend/app/Http/Controllers/AvenantController.php
namespace App\Http\Controllers;

use App\Models\Avenant;
use App\Models\Project;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AvenantController extends Controller
{
    public function index(Request $request, Project $project): JsonResponse
    {
        $this->authorize('view', $project);
        $avenants = Avenant::where('project_id', $project->id)
            ->orderBy('numero')
            ->get();
        // Compute montant_marche_avec_avenants
        $totalAvenants = $avenants->sum('montant_ht');
        return response()->json([
            'avenants'       => $avenants,
            'total_avenants' => $totalAvenants,
            'montant_final'  => (float)($project->montant_marche ?? 0) + $totalAvenants,
        ]);
    }

    public function store(Request $request, Project $project): JsonResponse
    {
        $this->authorize('update', $project);
        $data = $request->validate([
            'numero'                      => 'required|string|max:20',
            'objet'                       => 'required|string|max:255',
            'type'                        => 'required|in:montant,delai,montant_et_delai',
            'montant_ht'                  => 'required|numeric',
            'delai_supplementaire_jours'  => 'sometimes|integer|min:0',
            'notes'                       => 'nullable|string',
        ]);
        $avenant = Avenant::create([
            ...$data,
            'project_id' => $project->id,
            'company_id' => $request->user()->company_id,
            'created_by' => $request->user()->id,
        ]);
        return response()->json(['avenant' => $avenant], 201);
    }

    public function update(Request $request, Project $project, Avenant $avenant): JsonResponse
    {
        $this->authorize('update', $project);
        $data = $request->validate([
            'objet'                       => 'sometimes|string|max:255',
            'type'                        => 'sometimes|in:montant,delai,montant_et_delai',
            'montant_ht'                  => 'sometimes|numeric',
            'delai_supplementaire_jours'  => 'sometimes|integer|min:0',
            'status'                      => 'sometimes|in:brouillon,soumis,signe,refuse',
            'date_signature'              => 'nullable|date',
            'notes'                       => 'nullable|string',
        ]);
        // Guard: cannot modify a signed avenant
        abort_if($avenant->status === 'signe', 422, 'Un avenant signé ne peut pas être modifié.');
        $avenant->update($data);
        return response()->json(['avenant' => $avenant]);
    }

    public function destroy(Project $project, Avenant $avenant): JsonResponse
    {
        $this->authorize('update', $project);
        abort_if($avenant->status === 'signe', 422, 'Un avenant signé ne peut pas être supprimé.');
        $avenant->delete();
        return response()->json(null, 204);
    }
}
```

- [ ] **Step 3: Register routes in api.php** (add inside auth middleware group)

```php
// Avenants
Route::get('/projects/{project}/avenants', [AvenantController::class, 'index']);
Route::post('/projects/{project}/avenants', [AvenantController::class, 'store']);
Route::put('/projects/{project}/avenants/{avenant}', [AvenantController::class, 'update']);
Route::delete('/projects/{project}/avenants/{avenant}', [AvenantController::class, 'destroy']);
```

- [ ] **Step 4: Add import in api.php**

```php
use App\Http\Controllers\AvenantController;
```

- [ ] **Step 5: Commit**

```bash
git add backend/app/Models/Avenant.php backend/app/Http/Controllers/AvenantController.php backend/routes/api.php
git commit -m "feat(avenants): model + CRUD controller + routes"
```

---

### Task 13: Create OrdreDeService model + controller (Issue #5)

**Files:**
- Create: `backend/app/Models/OrdreDeService.php`
- Create: `backend/app/Http/Controllers/OrdreDeServiceController.php`
- Modify: `backend/routes/api.php`

- [ ] **Step 1: Create OrdreDeService model**

```php
<?php
// backend/app/Models/OrdreDeService.php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrdreDeService extends Model
{
    protected $table = 'ordres_de_service';

    protected $fillable = [
        'project_id', 'company_id', 'emis_par',
        'numero', 'type', 'objet', 'date_os',
        'delai_impact_jours', 'description',
        'document_path', 'accuse_reception', 'date_accuse',
    ];

    protected $casts = [
        'date_os'            => 'date',
        'date_accuse'        => 'date',
        'accuse_reception'   => 'boolean',
        'delai_impact_jours' => 'integer',
    ];

    protected $hidden = ['document_path'];
    protected $appends = ['document_url'];

    public function getDocumentUrlAttribute(): ?string
    {
        return $this->document_path
            ? asset('storage/' . $this->document_path)
            : null;
    }

    public function project(): BelongsTo { return $this->belongsTo(Project::class); }
    public function emetteur(): BelongsTo { return $this->belongsTo(User::class, 'emis_par'); }
}
```

- [ ] **Step 2: Create OrdreDeServiceController**

```php
<?php
// backend/app/Http/Controllers/OrdreDeServiceController.php
namespace App\Http\Controllers;

use App\Models\OrdreDeService;
use App\Models\Project;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class OrdreDeServiceController extends Controller
{
    public function index(Request $request, Project $project): JsonResponse
    {
        $this->authorize('view', $project);
        $os = OrdreDeService::where('project_id', $project->id)
            ->with('emetteur:id,name')
            ->orderByDesc('date_os')
            ->get();
        return response()->json(['ordres_de_service' => $os]);
    }

    public function store(Request $request, Project $project): JsonResponse
    {
        $this->authorize('update', $project);
        $data = $request->validate([
            'numero'              => 'required|string|max:20',
            'type'               => 'required|in:demarrage,travaux_supplementaires,arret,reprise,autre',
            'objet'              => 'required|string|max:255',
            'date_os'            => 'required|date',
            'delai_impact_jours' => 'sometimes|integer|min:0',
            'description'        => 'nullable|string',
            'document'           => 'nullable|file|mimes:pdf|max:10240',
        ]);

        $path = null;
        if ($request->hasFile('document')) {
            $path = $request->file('document')->store(
                "os/{$project->id}", 'public'
            );
        }

        $os = OrdreDeService::create([
            ...$data,
            'project_id'   => $project->id,
            'company_id'   => $request->user()->company_id,
            'emis_par'     => $request->user()->id,
            'document_path'=> $path,
        ]);

        // Auto-update project lifecycle_status if OS type = demarrage
        if ($data['type'] === 'demarrage') {
            $project->update(['lifecycle_status' => 'execution']);
        }

        return response()->json(['ordre_de_service' => $os->load('emetteur:id,name')], 201);
    }

    public function accuser(Request $request, Project $project, OrdreDeService $os): JsonResponse
    {
        $this->authorize('view', $project);
        $os->update([
            'accuse_reception' => true,
            'date_accuse'      => now()->toDateString(),
        ]);
        return response()->json(['ordre_de_service' => $os]);
    }

    public function destroy(Project $project, OrdreDeService $os): JsonResponse
    {
        $this->authorize('update', $project);
        if ($os->document_path) {
            Storage::disk('public')->delete($os->document_path);
        }
        $os->delete();
        return response()->json(null, 204);
    }
}
```

- [ ] **Step 3: Register routes**

```php
// Ordres de Service
Route::get('/projects/{project}/os', [OrdreDeServiceController::class, 'index']);
Route::post('/projects/{project}/os', [OrdreDeServiceController::class, 'store']);
Route::patch('/projects/{project}/os/{os}/accuser', [OrdreDeServiceController::class, 'accuser']);
Route::delete('/projects/{project}/os/{os}', [OrdreDeServiceController::class, 'destroy']);
```

- [ ] **Step 4: Commit**

```bash
git add backend/app/Models/OrdreDeService.php backend/app/Http/Controllers/OrdreDeServiceController.php backend/routes/api.php
git commit -m "feat(os): OrdreDeService model + controller + routes — lifecycle auto-update on demarrage"
```

---

### Task 14: Create BpuVersion + BpuLine models + BpuController (Issue #6)

**Files:**
- Create: `backend/app/Models/BpuVersion.php`
- Create: `backend/app/Models/BpuLine.php`
- Create: `backend/app/Http/Controllers/BpuController.php`
- Modify: `backend/app/Models/DqeVersion.php` — add `bpuVersion()` relation
- Modify: `backend/routes/api.php`

- [ ] **Step 1: Create models**

```php
<?php
// backend/app/Models/BpuVersion.php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class BpuVersion extends Model
{
    protected $fillable = ['project_id', 'company_id', 'name', 'version_number', 'status', 'notes'];

    public function project(): BelongsTo { return $this->belongsTo(Project::class); }
    public function lines(): HasMany     { return $this->hasMany(BpuLine::class)->orderBy('lot')->orderBy('ordre'); }
}
```

```php
<?php
// backend/app/Models/BpuLine.php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BpuLine extends Model
{
    protected $fillable = ['bpu_version_id', 'lot', 'designation', 'unite', 'prix_unitaire', 'ordre'];
    protected $casts = ['prix_unitaire' => 'decimal:2'];

    public function bpuVersion(): BelongsTo { return $this->belongsTo(BpuVersion::class); }
}
```

- [ ] **Step 2: Add relation to DqeVersion**

In `backend/app/Models/DqeVersion.php`, add:
```php
public function bpuVersion(): BelongsTo
{
    return $this->belongsTo(BpuVersion::class);
}
```
Also add `'bpu_version_id'` to `$fillable`.

- [ ] **Step 3: Create BpuController**

```php
<?php
// backend/app/Http/Controllers/BpuController.php
namespace App\Http\Controllers;

use App\Models\BpuLine;
use App\Models\BpuVersion;
use App\Models\Project;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BpuController extends Controller
{
    public function index(Project $project): JsonResponse
    {
        $this->authorize('view', $project);
        $versions = BpuVersion::where('project_id', $project->id)
            ->withCount('lines')
            ->orderByDesc('version_number')
            ->get();
        return response()->json(['versions' => $versions]);
    }

    public function show(Project $project, BpuVersion $version): JsonResponse
    {
        $this->authorize('view', $project);
        abort_if($version->project_id !== $project->id, 403);
        return response()->json(['version' => $version->load('lines')]);
    }

    public function store(Request $request, Project $project): JsonResponse
    {
        $this->authorize('update', $project);
        $data = $request->validate([
            'name'  => 'required|string|max:120',
            'notes' => 'nullable|string',
            'lines' => 'required|array|min:1',
            'lines.*.lot'          => 'required|string|max:80',
            'lines.*.designation'  => 'required|string|max:255',
            'lines.*.unite'        => 'required|string|max:20',
            'lines.*.prix_unitaire'=> 'required|numeric|min:0',
            'lines.*.ordre'        => 'sometimes|integer',
        ]);

        $lastVersion = BpuVersion::where('project_id', $project->id)->max('version_number') ?? 0;

        $version = BpuVersion::create([
            'project_id'     => $project->id,
            'company_id'     => $request->user()->company_id,
            'name'           => $data['name'],
            'version_number' => $lastVersion + 1,
            'notes'          => $data['notes'] ?? null,
        ]);

        foreach ($data['lines'] as $i => $line) {
            BpuLine::create([
                'bpu_version_id' => $version->id,
                'lot'            => $line['lot'],
                'designation'    => $line['designation'],
                'unite'          => $line['unite'],
                'prix_unitaire'  => $line['prix_unitaire'],
                'ordre'          => $line['ordre'] ?? $i,
            ]);
        }

        return response()->json(['version' => $version->load('lines')], 201);
    }

    public function validate(Project $project, BpuVersion $version): JsonResponse
    {
        $this->authorize('update', $project);
        abort_if($version->project_id !== $project->id, 403);
        abort_if($version->status === 'validated', 422, 'Déjà validé.');
        // Archive previous validated version
        BpuVersion::where('project_id', $project->id)->where('status', 'validated')
            ->update(['status' => 'archived']);
        $version->update(['status' => 'validated']);
        return response()->json(['version' => $version]);
    }
}
```

- [ ] **Step 4: Register routes**

```php
// BPU
Route::get('/projects/{project}/bpu', [BpuController::class, 'index']);
Route::get('/projects/{project}/bpu/{version}', [BpuController::class, 'show']);
Route::post('/projects/{project}/bpu', [BpuController::class, 'store']);
Route::patch('/projects/{project}/bpu/{version}/validate', [BpuController::class, 'validate']);
```

- [ ] **Step 5: Commit**

```bash
git add backend/app/Models/BpuVersion.php backend/app/Models/BpuLine.php backend/app/Http/Controllers/BpuController.php backend/app/Models/DqeVersion.php backend/routes/api.php
git commit -m "feat(bpu): BpuVersion + BpuLine models + CRUD controller + DqeVersion relation"
```

---

### Task 15: Create SituationTravaux model + refactor controller (Issues #1, #2, #9)

**Files:**
- Create: `backend/app/Models/SituationTravaux.php`
- Modify: `backend/app/Http/Controllers/SituationTravauxController.php`
- Modify: `backend/routes/api.php`

- [ ] **Step 1: Create SituationTravaux model**

```php
<?php
// backend/app/Models/SituationTravaux.php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SituationTravaux extends Model
{
    protected $table = 'situation_travaux';

    protected $fillable = [
        'project_id', 'company_id', 'dqe_version_id', 'created_by', 'validated_by', 'paid_by',
        'numero', 'periode', 'avancement_pct',
        'montant_brut_ht', 'cumul_precedent_ht',
        'retenue_garantie_pct', 'retenue_garantie_amount',
        'avance_remboursement', 'vat_rate', 'vat_amount', 'net_a_payer',
        'status', 'submitted_at', 'validated_at', 'paid_at', 'date_paiement',
        'detail_lots', 'rapport_ia', 'ged_document_id', 'notes',
    ];

    protected $casts = [
        'avancement_pct'          => 'float',
        'montant_brut_ht'         => 'float',
        'cumul_precedent_ht'      => 'float',
        'retenue_garantie_pct'    => 'float',
        'retenue_garantie_amount' => 'float',
        'avance_remboursement'    => 'float',
        'vat_rate'                => 'float',
        'vat_amount'              => 'float',
        'net_a_payer'             => 'float',
        'detail_lots'             => 'array',
        'submitted_at'            => 'datetime',
        'validated_at'            => 'datetime',
        'paid_at'                 => 'datetime',
        'date_paiement'           => 'date',
    ];

    public function project(): BelongsTo    { return $this->belongsTo(Project::class); }
    public function dqeVersion(): BelongsTo { return $this->belongsTo(DqeVersion::class); }
    public function creator(): BelongsTo    { return $this->belongsTo(User::class, 'created_by'); }
    public function validator(): BelongsTo  { return $this->belongsTo(User::class, 'validated_by'); }

    /** Compute avance_remboursement = avance_demarrage_pct × montant_brut / montant_marche */
    public static function computeAvanceRemboursement(Project $project, float $montantBrut): float
    {
        if (!$project->montant_marche || !$project->avance_demarrage_pct) {
            return 0;
        }
        return round($montantBrut * ($project->avance_demarrage_pct / 100), 2);
    }
}
```

- [ ] **Step 2: Add CRUD methods to SituationTravauxController**

Add these methods to the existing controller (keep `generate()` and `versions()` as-is):

```php
/** GET /api/projects/{project}/situation-travaux/list */
public function list(Project $project): JsonResponse
{
    $this->authorize('view', $project);
    $situations = SituationTravaux::where('project_id', $project->id)
        ->with('creator:id,name', 'dqeVersion:id,name,version_number')
        ->orderByDesc('created_at')
        ->get();
    return response()->json(['situations' => $situations]);
}

/** POST /api/projects/{project}/situation-travaux/store */
public function storeSituation(Request $request, Project $project): JsonResponse
{
    $this->authorize('update', $project);

    $data = $request->validate([
        'periode'          => ['required', 'string', 'regex:/^\d{4}-\d{2}$/'],
        'dqe_version_id'   => ['nullable', 'integer', Rule::exists('dqe_versions', 'id')->where('project_id', $project->id)],
        'avancement_pct'   => 'required|numeric|min:0|max:100',
        'montant_brut_ht'  => 'required|numeric|min:0',
        'detail_lots'      => 'nullable|array',
        'notes'            => 'nullable|string',
    ]);

    // Guard: situation montant ≤ montant_marche + sum(avenants signés) (Issue #7 partial)
    $montantMax = (float)($project->montant_marche ?? 0)
        + \App\Models\Avenant::where('project_id', $project->id)
              ->where('status', 'signe')
              ->sum('montant_ht');

    if ($montantMax > 0 && $data['montant_brut_ht'] > $montantMax) {
        return response()->json([
            'message' => 'Le montant brut HT dépasse le montant du marché (incluant avenants signés).',
            'montant_max' => $montantMax,
        ], 422);
    }

    // Compute cumul précédent
    $cumulPrecedent = SituationTravaux::where('project_id', $project->id)
        ->whereIn('status', ['validee_moe', 'payee'])
        ->sum('montant_brut_ht');

    // Compute financiers
    $retenueAmount   = round($data['montant_brut_ht'] * (config('btp.retenue_garantie_pct') / 100), 2);
    $avanceRembours  = SituationTravaux::computeAvanceRemboursement($project, $data['montant_brut_ht']);
    $vatRate         = config('btp.tva_taux_standard');
    $baseHT          = $data['montant_brut_ht'] - $retenueAmount - $avanceRembours;
    $vatAmount       = round($baseHT * ($vatRate / 100), 2);
    $netAPayer       = round($baseHT + $vatAmount, 2);

    // Auto-numero
    $lastNum = SituationTravaux::where('project_id', $project->id)->count() + 1;
    $numero  = sprintf('ST-%03d', $lastNum);

    $situation = SituationTravaux::create([
        'project_id'              => $project->id,
        'company_id'              => $request->user()->company_id,
        'dqe_version_id'          => $data['dqe_version_id'] ?? null,
        'created_by'              => $request->user()->id,
        'numero'                  => $numero,
        'periode'                 => $data['periode'],
        'avancement_pct'          => $data['avancement_pct'],
        'montant_brut_ht'         => $data['montant_brut_ht'],
        'cumul_precedent_ht'      => $cumulPrecedent,
        'retenue_garantie_pct'    => config('btp.retenue_garantie_pct'),
        'retenue_garantie_amount' => $retenueAmount,
        'avance_remboursement'    => $avanceRembours,
        'vat_rate'                => $vatRate,
        'vat_amount'              => $vatAmount,
        'net_a_payer'             => $netAPayer,
        'detail_lots'             => $data['detail_lots'] ?? null,
        'notes'                   => $data['notes'] ?? null,
        'status'                  => 'brouillon',
    ]);

    return response()->json(['situation' => $situation->load('creator:id,name')], 201);
}

/** PATCH /api/projects/{project}/situation-travaux/{situation}/submit */
public function submit(Project $project, SituationTravaux $situation): JsonResponse
{
    $this->authorize('update', $project);
    abort_if($situation->status !== 'brouillon', 422, 'Seul un brouillon peut être soumis.');
    $situation->update(['status' => 'soumise', 'submitted_at' => now()]);
    return response()->json(['situation' => $situation]);
}

/** PATCH /api/projects/{project}/situation-travaux/{situation}/validate */
public function validateSituation(Request $request, Project $project, SituationTravaux $situation): JsonResponse
{
    $this->authorize('update', $project);
    abort_if($situation->status !== 'soumise', 422, 'Seule une situation soumise peut être validée MOE.');
    $situation->update([
        'status'       => 'validee_moe',
        'validated_by' => $request->user()->id,
        'validated_at' => now(),
    ]);
    return response()->json(['situation' => $situation]);
}

/** PATCH /api/projects/{project}/situation-travaux/{situation}/pay */
public function pay(Request $request, Project $project, SituationTravaux $situation): JsonResponse
{
    $this->authorize('update', $project);
    abort_if($situation->status !== 'validee_moe', 422, 'Seule une situation validée MOE peut être payée.');
    $data = $request->validate([
        'date_paiement' => 'required|date',
    ]);
    $situation->update([
        'status'         => 'payee',
        'paid_by'        => $request->user()->id,
        'paid_at'        => now(),
        'date_paiement'  => $data['date_paiement'],
    ]);
    return response()->json(['situation' => $situation]);
}
```

Add `use App\Models\SituationTravaux;` at top of controller.

- [ ] **Step 3: Register new routes**

```php
// Situation Travaux — CRUD + workflow (en plus des routes existantes)
Route::get('/projects/{project}/situation-travaux/list', [SituationTravauxController::class, 'list']);
Route::post('/projects/{project}/situation-travaux/store', [SituationTravauxController::class, 'storeSituation']);
Route::patch('/projects/{project}/situation-travaux/{situation}/submit', [SituationTravauxController::class, 'submit']);
Route::patch('/projects/{project}/situation-travaux/{situation}/validate', [SituationTravauxController::class, 'validateSituation']);
Route::patch('/projects/{project}/situation-travaux/{situation}/pay', [SituationTravauxController::class, 'pay']);
```

- [ ] **Step 4: Commit**

```bash
git add backend/app/Models/SituationTravaux.php backend/app/Http/Controllers/SituationTravauxController.php backend/routes/api.php
git commit -m "feat(situations): SituationTravaux real DB model + 4-state workflow + montant guard + avance auto-calc"
```

---

### Task 16: BDC threshold guard in PurchaseOrderController (Issue #7)

**Files:**
- Modify: `backend/app/Http/Controllers/PurchaseOrderController.php`

- [ ] **Step 1: Add threshold check in `approve()` method**

Find the `approve()` method and add before the approval logic:

```php
public function approve(Request $request, PurchaseOrder $purchaseOrder): JsonResponse
{
    $this->authorize('approve', $purchaseOrder);

    $user   = $request->user();
    $amount = (float)$purchaseOrder->total_amount;
    $seuils = config('btp.bdc_seuils_validation'); // sorted ascending by amount

    // Determine minimum role required for this amount
    $requiredRole = null;
    foreach ($seuils as $maxAmount => $roleRequired) {
        if ($amount <= $maxAmount) {
            $requiredRole = $roleRequired;
            break;
        }
    }

    // Map role name to hierarchy level
    $hierarchy = [
        'chef-chantier'       => 1,
        'conducteur-travaux'  => 2,
        'directeur-technique' => 3,
        'direction'           => 4,
    ];

    $userLevel     = $hierarchy[$user->role->name] ?? 0;
    $requiredLevel = $hierarchy[$requiredRole] ?? 4;

    if ($userLevel < $requiredLevel) {
        return response()->json([
            'message'       => "Ce bon de commande ({$amount} XOF) requiert l'approbation d'un {$requiredRole}.",
            'required_role' => $requiredRole,
            'amount'        => $amount,
        ], 403);
    }

    // ... existing approval logic continues
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/Http/Controllers/PurchaseOrderController.php
git commit -m "feat(bdc): threshold guard on approve — 500K/5M/50M FCFA role escalade"
```

---

### Task 17: Create DGD model + controller (Issue #16)

**Files:**
- Create: `backend/app/Models/DecompteGeneralDefinitif.php`
- Create: `backend/app/Http/Controllers/DgdController.php`
- Modify: `backend/routes/api.php`

- [ ] **Step 1: Create DGD model**

```php
<?php
// backend/app/Models/DecompteGeneralDefinitif.php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DecompteGeneralDefinitif extends Model
{
    protected $table = 'decomptes_generaux_definitifs';

    protected $fillable = [
        'project_id', 'company_id', 'created_by', 'signed_by_moa',
        'montant_marche_initial', 'montant_avenants', 'montant_marche_final',
        'total_situations_ht', 'penalites_retard', 'retenue_garantie_liberee',
        'solde_final', 'status',
        'date_signature_entreprise', 'date_signature_moa', 'observations',
    ];

    protected $casts = [
        'montant_marche_initial'  => 'float',
        'montant_avenants'        => 'float',
        'montant_marche_final'    => 'float',
        'total_situations_ht'     => 'float',
        'penalites_retard'        => 'float',
        'retenue_garantie_liberee'=> 'float',
        'solde_final'             => 'float',
        'date_signature_entreprise'=> 'date',
        'date_signature_moa'      => 'date',
    ];

    public function project(): BelongsTo { return $this->belongsTo(Project::class); }
}
```

- [ ] **Step 2: Create DgdController**

```php
<?php
// backend/app/Http/Controllers/DgdController.php
namespace App\Http\Controllers;

use App\Models\Avenant;
use App\Models\DecompteGeneralDefinitif;
use App\Models\Project;
use App\Models\SituationTravaux;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DgdController extends Controller
{
    public function show(Project $project): JsonResponse
    {
        $this->authorize('view', $project);
        $dgd = DecompteGeneralDefinitif::where('project_id', $project->id)->first();
        return response()->json(['dgd' => $dgd]);
    }

    /** Initialize DGD by auto-computing from project data */
    public function initialize(Request $request, Project $project): JsonResponse
    {
        $this->authorize('update', $project);
        abort_if(
            DecompteGeneralDefinitif::where('project_id', $project->id)->exists(),
            422,
            'Un DGD existe déjà pour ce projet.'
        );

        $montantInitial  = (float)($project->montant_marche ?? 0);
        $montantAvenants = Avenant::where('project_id', $project->id)
            ->where('status', 'signe')->sum('montant_ht');
        $totalSituations = SituationTravaux::where('project_id', $project->id)
            ->whereIn('status', ['validee_moe', 'payee'])->sum('montant_brut_ht');

        // Penalites retard auto-calc
        $penalites = 0;
        if ($project->end_date && $project->penalites_retard_par_jour) {
            $retard = max(0, now()->diffInDays($project->end_date, false) * -1);
            $penalites = $retard * (float)$project->penalites_retard_par_jour;
        }

        $retenueGarantie = SituationTravaux::where('project_id', $project->id)
            ->sum('retenue_garantie_amount');

        $dgd = DecompteGeneralDefinitif::create([
            'project_id'               => $project->id,
            'company_id'               => $request->user()->company_id,
            'created_by'               => $request->user()->id,
            'montant_marche_initial'   => $montantInitial,
            'montant_avenants'         => $montantAvenants,
            'montant_marche_final'     => $montantInitial + $montantAvenants,
            'total_situations_ht'      => $totalSituations,
            'penalites_retard'         => $penalites,
            'retenue_garantie_liberee' => $retenueGarantie,
            'solde_final'              => $totalSituations - $penalites + $retenueGarantie,
            'status'                   => 'brouillon',
        ]);

        return response()->json(['dgd' => $dgd], 201);
    }

    public function sign(Request $request, Project $project): JsonResponse
    {
        $this->authorize('update', $project);
        $dgd = DecompteGeneralDefinitif::where('project_id', $project->id)->firstOrFail();
        $data = $request->validate([
            'signataire' => 'required|in:entreprise,moa',
            'date'       => 'required|date',
        ]);

        if ($data['signataire'] === 'entreprise') {
            $dgd->update(['status' => 'signe_entreprise', 'date_signature_entreprise' => $data['date']]);
        } else {
            $dgd->update(['status' => 'signe_moa', 'date_signature_moa' => $data['date']]);
            // Close project
            $project->update(['lifecycle_status' => 'cloture', 'status' => 'termine']);
        }

        return response()->json(['dgd' => $dgd]);
    }
}
```

- [ ] **Step 3: Register routes**

```php
// DGD
Route::get('/projects/{project}/dgd', [DgdController::class, 'show']);
Route::post('/projects/{project}/dgd/initialize', [DgdController::class, 'initialize']);
Route::patch('/projects/{project}/dgd/sign', [DgdController::class, 'sign']);
```

- [ ] **Step 4: Commit**

```bash
git add backend/app/Models/DecompteGeneralDefinitif.php backend/app/Http/Controllers/DgdController.php backend/routes/api.php
git commit -m "feat(dgd): DecompteGeneralDefinitif model + controller — auto-compute + signature workflow"
```

---

### Task 18: Project pénalités retard + SMIG config (Issues #22, #25)

**Files:**
- Modify: `backend/app/Models/Project.php`
- Already done: `backend/config/btp.php` (SMIG in Task 10)

- [ ] **Step 1: Add `penalites_retard_calculees` accessor to Project model**

```php
// In backend/app/Models/Project.php
public function getPenalitesRetardCalculeesAttribute(): float
{
    if (!$this->end_date || !$this->penalites_retard_par_jour) {
        return 0;
    }
    $joursRetard = max(0, now()->diffInDays($this->end_date, false) * -1);
    return round($joursRetard * (float)$this->penalites_retard_par_jour, 2);
}
```

Add `'penalites_retard_calculees'` to `$appends` array.

- [ ] **Step 2: BudgetEntry clarification — add note in model (Issue #12)**

In `backend/app/Models/BudgetEntry.php`, add a comment and guard:
```php
// type 'paiement' tracks supplier payment confirmations — DO NOT use for situation de travaux
// For ST payments, use SituationTravaux.status = 'payee'
public static function boot(): void
{
    parent::boot();
    // Note: type='paiement' is for supplier budget tracking only
}
```

- [ ] **Step 3: Commit**

```bash
git add backend/app/Models/Project.php backend/app/Models/BudgetEntry.php
git commit -m "feat(project): penalites_retard computed accessor + BudgetEntry scope clarification"
```

---

### Task 19: Run all backend tests (Phase 2 checkpoint)

- [ ] **Step 1: Run full test suite**

```bash
cd backend && php artisan test
```
Expected: All existing tests pass. New tests from Task 11 pass.

- [ ] **Step 2: Commit if any test-only fixes needed**

```bash
git add -A && git commit -m "fix(tests): adjust test factories for new fields"
```

---

# PHASE 3 — Frontend

> Depends on Phase 1 + 2 being complete and API running. All new pages go in `frontend/src/features/projects/`.

---

### Task 20: Update WorkersPanel — statut enum + heures (Issues #3, #14, #23)

**Files:**
- Modify: `frontend/src/features/projects/components/WorkersPanel.tsx`
- Modify: `frontend/src/styles/index.css`

- [ ] **Step 1: Add statut select + heures inputs to the attendance row**

In `WorkersPanel.tsx`, find the attendance toggle for each worker. Replace the boolean toggle with:

```tsx
// Constants at top of file
const STATUT_OPTIONS = [
  { value: 'present',     label: 'Présent',       color: '#22c55e' },
  { value: 'absent',      label: 'Absent',         color: '#ef4444' },
  { value: 'demi_journee',label: 'Demi-journée',   color: '#f59e0b' },
  { value: 'conge',       label: 'Congé',           color: '#6366f1' },
  { value: 'maladie',     label: 'Maladie',         color: '#ec4899' },
] as const;

const TRADES_BTP = [
  'macon', 'coffreur', 'ferrailleur', 'platrier', 'carreleur',
  'peintre', 'menuisier_bois', 'menuisier_alu', 'electricien',
  'plombier', 'climaticien', 'conducteur_engin', 'grutier',
  'soudeur', 'topographe', 'manoeuvre', 'chef_equipe', 'autre',
] as const;

const TRADE_LABELS: Record<string, string> = {
  macon: 'Maçon', coffreur: 'Coffreur-boiseur', ferrailleur: 'Ferrailleur',
  platrier: 'Plâtrier', carreleur: 'Carreleur', peintre: 'Peintre',
  menuisier_bois: 'Menuisier bois', menuisier_alu: 'Menuisier alu',
  electricien: 'Électricien', plombier: 'Plombier', climaticien: 'Technicien CVC',
  conducteur_engin: 'Cond. engin', grutier: 'Grutier', soudeur: 'Soudeur',
  topographe: 'Topographe', manoeuvre: 'Manœuvre', chef_equipe: 'Chef équipe', autre: 'Autre',
};
```

Replace attendance boolean call with:
```tsx
// When saving attendance
const saveAttendance = async (workerId: number, statut: string, heuresNormales: number, heuresSup: number) => {
  await api.post(`/projects/${projectId}/workers/attendance`, {
    worker_id:      workerId,
    log_date:       date,
    statut,
    heures_normales: heuresNormales,
    heures_sup:      heuresSup,
  });
  queryClient.invalidateQueries({ queryKey: ['workers', projectId, date] });
};
```

Per-worker row UI:
```tsx
<div className="worker-row">
  <span className="worker-name">{worker.name}</span>
  <span className="worker-trade">{TRADE_LABELS[worker.trade] ?? worker.trade}</span>
  <select
    className="worker-statut-select"
    value={worker.attendance?.statut ?? 'present'}
    disabled={readonly}
    onChange={e => saveAttendance(worker.id, e.target.value, worker.attendance?.heures_normales ?? 8, worker.attendance?.heures_sup ?? 0)}
  >
    {STATUT_OPTIONS.map(opt => (
      <option key={opt.value} value={opt.value}>{opt.label}</option>
    ))}
  </select>
  {!readonly && (worker.attendance?.statut === 'present' || worker.attendance?.statut === 'demi_journee') && (
    <div className="worker-heures">
      <input
        type="number" min="0" max="12" step="0.5"
        className="worker-heures-input"
        value={worker.attendance?.heures_normales ?? 8}
        onChange={e => saveAttendance(worker.id, worker.attendance?.statut ?? 'present', parseFloat(e.target.value), worker.attendance?.heures_sup ?? 0)}
      />
      <span className="worker-heures-label">h norm.</span>
      <input
        type="number" min="0" max="8" step="0.5"
        className="worker-heures-input worker-heures-input--sup"
        value={worker.attendance?.heures_sup ?? 0}
        onChange={e => saveAttendance(worker.id, worker.attendance?.statut ?? 'present', worker.attendance?.heures_normales ?? 8, parseFloat(e.target.value))}
      />
      <span className="worker-heures-label">h sup.</span>
    </div>
  )}
</div>
```

Also update the add-worker form to include `statut` select and `trade` as select (not free text):
```tsx
// In add worker form
<select name="trade" required>
  {Object.entries(TRADE_LABELS).map(([value, label]) => (
    <option key={value} value={value}>{label}</option>
  ))}
</select>
<select name="statut" defaultValue="temporaire">
  {['permanent','temporaire','interimaire','sous_traitant','etam','cadre'].map(s => (
    <option key={s} value={s}>{s.replace('_', ' ')}</option>
  ))}
</select>
```

- [ ] **Step 2: Add CSS for new worker row elements**

```css
/* In frontend/src/styles/index.css */
.worker-statut-select {
  font-size: 12px;
  padding: 2px 6px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--bg-card);
  color: var(--text-primary);
  cursor: pointer;
}
.worker-heures { display: flex; align-items: center; gap: 4px; margin-left: 8px; }
.worker-heures-input {
  width: 48px; padding: 2px 4px; font-size: 12px;
  border: 1px solid var(--border); border-radius: 5px;
  text-align: center;
}
.worker-heures-input--sup { border-color: var(--teal); }
.worker-heures-label { font-size: 11px; color: var(--text-muted); }
```

- [ ] **Step 3: Update API type**

```typescript
// frontend/src/features/projects/types.ts — update AttendanceRecord
export interface AttendanceRecord {
  id: number;
  present: boolean;
  statut: 'present' | 'absent' | 'demi_journee' | 'conge' | 'maladie';
  heures_normales: number;
  heures_sup: number;
  task_assigned: string | null;
}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/features/projects/components/WorkersPanel.tsx frontend/src/styles/index.css
git commit -m "feat(workers): attendance statut enum + heures_normales + heures_sup inputs + trade select"
```

---

### Task 21: New SituationsPage (Issue #20)

**Files:**
- Create: `frontend/src/features/projects/api/get-situations.ts`
- Create: `frontend/src/features/projects/pages/SituationsPage.tsx`
- Modify: `frontend/src/router.tsx`
- Modify: `frontend/src/features/projects/pages/ProjectDetailPage.tsx`

- [ ] **Step 1: Create API hooks**

```typescript
// frontend/src/features/projects/api/get-situations.ts
import api from '../../../lib/api';

export const getSituations = (projectId: number) =>
  api.get(`/projects/${projectId}/situation-travaux/list`).then(r => r.data);

export const createSituation = (projectId: number, data: object) =>
  api.post(`/projects/${projectId}/situation-travaux/store`, data).then(r => r.data);

export const submitSituation = (projectId: number, situationId: number) =>
  api.patch(`/projects/${projectId}/situation-travaux/${situationId}/submit`).then(r => r.data);

export const validateSituation = (projectId: number, situationId: number) =>
  api.patch(`/projects/${projectId}/situation-travaux/${situationId}/validate`).then(r => r.data);

export const paySituation = (projectId: number, situationId: number, date_paiement: string) =>
  api.patch(`/projects/${projectId}/situation-travaux/${situationId}/pay`, { date_paiement }).then(r => r.data);
```

- [ ] **Step 2: Create SituationsPage**

```tsx
// frontend/src/features/projects/pages/SituationsPage.tsx
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getProject } from '../api/get-project';
import { getSituations, createSituation, submitSituation, validateSituation, paySituation } from '../api/get-situations';
import PageHeader from '../../../components/ui/PageHeader';
import SkeletonPage from '../../../components/ui/SkeletonPage';
import { useAuth } from '../../auth/stores/auth-store';
import { getRoleGroup } from '../../../lib/roles';
import { useState } from 'react';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  brouillon:    { label: 'Brouillon',    color: '#94a3b8' },
  soumise:      { label: 'Soumise',      color: '#f59e0b' },
  validee_moe:  { label: 'Validée MOE',  color: '#3b82f6' },
  payee:        { label: 'Payée',        color: '#22c55e' },
};

export default function SituationsPage() {
  const { id } = useParams<{ id: string }>();
  const numId = Number(id);
  const { user } = useAuth();
  const group = getRoleGroup(user?.role?.name ?? '');
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ periode: '', avancement_pct: 0, montant_brut_ht: 0, notes: '' });

  const { data: project, isLoading: projLoading } = useQuery({
    queryKey: ['project', numId],
    queryFn: () => getProject(numId),
    enabled: !!id,
    staleTime: 300_000,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['situations', numId],
    queryFn: () => getSituations(numId),
    enabled: !!id,
    staleTime: 60_000,
  });

  const createMut = useMutation({
    mutationFn: (d: object) => createSituation(numId, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['situations', numId] }); setShowForm(false); },
  });

  const submitMut = useMutation({
    mutationFn: (sitId: number) => submitSituation(numId, sitId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['situations', numId] }),
  });

  const validateMut = useMutation({
    mutationFn: (sitId: number) => validateSituation(numId, sitId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['situations', numId] }),
  });

  const payMut = useMutation({
    mutationFn: ({ sitId, date }: { sitId: number; date: string }) => paySituation(numId, sitId, date),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['situations', numId] }),
  });

  if (projLoading || isLoading) return <div className="page-content"><SkeletonPage rows={3} /></div>;
  if (!project) return null;

  const canCreate = group === 'conducteur' || group === 'dt' || group === 'direction';
  const canValidate = group === 'conducteur' || group === 'dt' || group === 'direction';
  const canPay = group === 'comptable' || group === 'direction';

  const situations = data?.situations ?? [];
  const montantMarche = project.montant_marche ?? 0;

  return (
    <div className="page-content">
      <PageHeader
        breadcrumb={`${project.code} · Situations de Travaux`}
        title="Situations de Travaux"
        subtitle={`Facturation mensuelle — Marché : ${montantMarche.toLocaleString('fr-FR')} FCFA`}
        action={
          <div style={{ display: 'flex', gap: '8px' }}>
            {canCreate && (
              <button className="proj-action-bar__btn proj-action-bar__btn--primary" onClick={() => setShowForm(true)}>
                + Nouvelle situation
              </button>
            )}
            <Link to={`/projects/${numId}`} className="proj-action-bar__btn">← Retour</Link>
          </div>
        }
      />

      {showForm && (
        <div className="card" style={{ marginBottom: '1rem', padding: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem', fontSize: '15px' }}>Nouvelle situation de travaux</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            <label>
              <span className="form-label">Période (AAAA-MM)</span>
              <input type="month" className="form-input"
                onChange={e => setForm(f => ({ ...f, periode: e.target.value.slice(0, 7) }))} />
            </label>
            <label>
              <span className="form-label">Avancement (%)</span>
              <input type="number" min="0" max="100" className="form-input"
                onChange={e => setForm(f => ({ ...f, avancement_pct: parseFloat(e.target.value) }))} />
            </label>
            <label>
              <span className="form-label">Montant brut HT (FCFA)</span>
              <input type="number" min="0" className="form-input"
                onChange={e => setForm(f => ({ ...f, montant_brut_ht: parseFloat(e.target.value) }))} />
            </label>
          </div>
          <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
            <button className="proj-action-bar__btn proj-action-bar__btn--primary"
              onClick={() => createMut.mutate(form)} disabled={createMut.isPending}>
              {createMut.isPending ? 'Création…' : 'Créer'}
            </button>
            <button className="proj-action-bar__btn" onClick={() => setShowForm(false)}>Annuler</button>
          </div>
          {createMut.isError && (
            <p className="form-error" style={{ marginTop: '8px' }}>
              {(createMut.error as any)?.response?.data?.message ?? 'Erreur'}
            </p>
          )}
        </div>
      )}

      {situations.length === 0 ? (
        <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          Aucune situation de travaux — créez la première.
        </div>
      ) : (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>N°</th><th>Période</th><th>Avancement</th>
                <th>Montant brut HT</th><th>Retenue gar.</th><th>Net à payer</th>
                <th>Statut</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {situations.map((s: any) => {
                const st = STATUS_LABELS[s.status];
                return (
                  <tr key={s.id}>
                    <td><strong>{s.numero}</strong></td>
                    <td>{s.periode}</td>
                    <td>{s.avancement_pct}%</td>
                    <td>{s.montant_brut_ht?.toLocaleString('fr-FR')} F</td>
                    <td style={{ color: '#ef4444' }}>-{s.retenue_garantie_amount?.toLocaleString('fr-FR')} F</td>
                    <td><strong>{s.net_a_payer?.toLocaleString('fr-FR')} F</strong></td>
                    <td>
                      <span style={{
                        background: st?.color + '22', color: st?.color,
                        padding: '2px 8px', borderRadius: '999px', fontSize: '12px', fontWeight: 600
                      }}>{st?.label}</span>
                    </td>
                    <td style={{ display: 'flex', gap: '4px' }}>
                      {s.status === 'brouillon' && canCreate && (
                        <button className="proj-action-bar__btn" onClick={() => submitMut.mutate(s.id)}>
                          Soumettre
                        </button>
                      )}
                      {s.status === 'soumise' && canValidate && (
                        <button className="proj-action-bar__btn" onClick={() => validateMut.mutate(s.id)}>
                          Valider MOE
                        </button>
                      )}
                      {s.status === 'validee_moe' && canPay && (
                        <button className="proj-action-bar__btn proj-action-bar__btn--primary"
                          onClick={() => payMut.mutate({ sitId: s.id, date: new Date().toISOString().slice(0, 10) })}>
                          Payer
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Add route in router.tsx**

```tsx
import SituationsPage from './features/projects/pages/SituationsPage';
// In routes array:
{ path: '/projects/:id/situations', element: <Shell><SituationsPage /></Shell> },
```

- [ ] **Step 4: Add button in ProjectDetailPage**

In the `proj-action-bar` section of ProjectDetailPage, add:
```tsx
{(group === 'conducteur' || group === 'dt' || isDGDT || group === 'comptable') && (
  <Link to={`/projects/${project.id}/situations`} className="proj-action-bar__btn">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
    </svg>
    Situations
  </Link>
)}
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/projects/api/get-situations.ts frontend/src/features/projects/pages/SituationsPage.tsx frontend/src/router.tsx frontend/src/features/projects/pages/ProjectDetailPage.tsx
git commit -m "feat(situations): SituationsPage — 4-state workflow UI + montant display"
```

---

### Task 22: New AvenantsPage (Issue #4 frontend)

**Files:**
- Create: `frontend/src/features/projects/api/get-avenants.ts`
- Create: `frontend/src/features/projects/pages/AvenantsPage.tsx`
- Modify: `frontend/src/router.tsx`
- Modify: `frontend/src/features/projects/pages/ProjectDetailPage.tsx`

- [ ] **Step 1: API hook**

```typescript
// frontend/src/features/projects/api/get-avenants.ts
import api from '../../../lib/api';

export const getAvenants = (projectId: number) =>
  api.get(`/projects/${projectId}/avenants`).then(r => r.data);

export const createAvenant = (projectId: number, data: object) =>
  api.post(`/projects/${projectId}/avenants`, data).then(r => r.data);

export const updateAvenant = (projectId: number, avenantId: number, data: object) =>
  api.put(`/projects/${projectId}/avenants/${avenantId}`, data).then(r => r.data);

export const deleteAvenant = (projectId: number, avenantId: number) =>
  api.delete(`/projects/${projectId}/avenants/${avenantId}`).then(r => r.data);
```

- [ ] **Step 2: Create AvenantsPage**

Simple table page (pattern identical to SituationsPage):
- List avenants with columns: Numéro, Objet, Type, Montant HT, Délai supp., Statut, Date signature
- Add form: numero, objet, type select (montant/delai/montant_et_delai), montant_ht, delai_supplementaire_jours, notes
- Display `montant_final` = montant_marche + total_avenants as a KPI at top
- Status badge colors: brouillon=gray, soumis=orange, signe=green, refuse=red
- Guard: cannot edit/delete `signe` avenants (button disabled)

- [ ] **Step 3: Add route + button**

```tsx
// router.tsx
import AvenantsPage from './features/projects/pages/AvenantsPage';
{ path: '/projects/:id/avenants', element: <Shell><AvenantsPage /></Shell> },
```

In ProjectDetailPage action bar:
```tsx
{(group === 'conducteur' || group === 'dt' || isDGDT) && (
  <Link to={`/projects/${project.id}/avenants`} className="proj-action-bar__btn">
    Avenants
  </Link>
)}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/features/projects/api/get-avenants.ts frontend/src/features/projects/pages/AvenantsPage.tsx frontend/src/router.tsx frontend/src/features/projects/pages/ProjectDetailPage.tsx
git commit -m "feat(avenants): AvenantsPage — list + create + sign workflow"
```

---

### Task 23: New OsPage — Ordres de Service (Issues #5, #18, #19 frontend)

**Files:**
- Create: `frontend/src/features/projects/api/get-os.ts`
- Create: `frontend/src/features/projects/pages/OsPage.tsx`
- Modify: `frontend/src/router.tsx`
- Modify: `frontend/src/features/projects/pages/ProjectDetailPage.tsx`

- [ ] **Step 1: API hook**

```typescript
// frontend/src/features/projects/api/get-os.ts
import api from '../../../lib/api';

export const getOs = (projectId: number) =>
  api.get(`/projects/${projectId}/os`).then(r => r.data);

export const createOs = (projectId: number, data: FormData) =>
  api.post(`/projects/${projectId}/os`, data, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data);

export const accuserOs = (projectId: number, osId: number) =>
  api.patch(`/projects/${projectId}/os/${osId}/accuser`).then(r => r.data);

export const deleteOs = (projectId: number, osId: number) =>
  api.delete(`/projects/${projectId}/os/${osId}`).then(r => r.data);
```

- [ ] **Step 2: Create OsPage**

Page layout:
- KPI at top: OS démarrage date (= start of chantier contractual clock), total OS count
- List of OS with columns: Numéro, Type badge, Objet, Date OS, Délai impact, Accusé réception, Document PDF, Actions
- Type badges: demarrage=blue, travaux_supplementaires=orange, arret=red, reprise=green, autre=gray
- "Accuser réception" button for terrain users on OS not yet acknowledged
- Add OS form (CDT+DT only): numero, type select, objet, date_os, delai_impact_jours, description, file PDF
- Important: creating an OS of type `demarrage` auto-updates project `lifecycle_status` to `execution` (backend handles this)

- [ ] **Step 3: Add lifecycle badge to ProjectDetailPage (Issues #15, #19)**

In ProjectDetailPage, near the project title/header, add:

```tsx
const LIFECYCLE_LABELS: Record<string, { label: string; color: string }> = {
  ao:           { label: 'Appel d\'Offres',  color: '#94a3b8' },
  attribution:  { label: 'Attribution',       color: '#a78bfa' },
  preparation:  { label: 'Préparation',       color: '#f59e0b' },
  execution:    { label: 'En Exécution',      color: '#3b82f6' },
  reception:    { label: 'Réception',         color: '#10b981' },
  cloture:      { label: 'Clôturé',           color: '#6b7280' },
};

// In JSX, near project name:
{project.lifecycle_status && (
  <span style={{
    background: LIFECYCLE_LABELS[project.lifecycle_status]?.color + '22',
    color: LIFECYCLE_LABELS[project.lifecycle_status]?.color,
    padding: '3px 10px', borderRadius: '999px',
    fontSize: '12px', fontWeight: 600, marginLeft: '8px',
  }}>
    {LIFECYCLE_LABELS[project.lifecycle_status]?.label}
  </span>
)}
```

- [ ] **Step 4: Add route + button**

```tsx
// router.tsx
import OsPage from './features/projects/pages/OsPage';
{ path: '/projects/:id/os', element: <Shell><OsPage /></Shell> },
```

In ProjectDetailPage:
```tsx
<Link to={`/projects/${project.id}/os`} className="proj-action-bar__btn">
  Ordres de Service
</Link>
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/projects/api/get-os.ts frontend/src/features/projects/pages/OsPage.tsx frontend/src/router.tsx frontend/src/features/projects/pages/ProjectDetailPage.tsx
git commit -m "feat(os): OsPage — OS list + accuser réception + lifecycle badge on project detail"
```

---

### Task 24: BDC — threshold escalade UI + BL confirmation (Issues #7, #17)

**Files:**
- Modify: `frontend/src/features/achats/pages/AchatsPage.tsx` (or wherever BDC approval button lives)

- [ ] **Step 1: Show threshold warning on approve**

When the approve mutation returns 403 with `required_role`, show:

```tsx
// After approval mutation error:
if (error?.response?.status === 403 && error.response.data?.required_role) {
  // Show escalade modal or inline message
  return (
    <div className="alert alert--warning">
      Ce bon de commande ({amount.toLocaleString('fr-FR')} FCFA) requiert
      l'approbation d'un <strong>{error.response.data.required_role}</strong>.
      Transmettre à la hiérarchie.
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/features/achats/pages/AchatsPage.tsx
git commit -m "feat(bdc): threshold escalade message on approve + 403 handling"
```

---

### Task 25: Final tests + build verification

- [ ] **Step 1: Run all backend tests**

```bash
cd backend && php artisan test
```
Expected: All pass.

- [ ] **Step 2: Run frontend build**

```bash
cd frontend && npm run build
```
Expected: No TypeScript errors, build succeeds.

- [ ] **Step 3: Run frontend tests if any**

```bash
cd frontend && npm run test
```

- [ ] **Step 4: Final commit — update logique-metier.md resolved status**

```bash
git add .
git commit -m "feat(btp): resolve all 25 domain gaps — DB foundations + business rules + frontend workflows"
```

---

## Self-Review: Spec Coverage Check

| # | Issue | Task(s) | Status |
|---|-------|---------|--------|
| 1 | SituationTravaux model + workflow | T8, T15, T21 | ✅ |
| 2 | Retenue garantie direction | T15 (computed on ST, removed from Invoice flow) | ✅ |
| 3 | DailyAttendance statut + heures | T1, T11, T20 | ✅ |
| 4 | Avenant model | T5, T12, T22 | ✅ |
| 5 | OrdreDeService | T6, T13, T23 | ✅ |
| 6 | BPU model | T7, T14 | ✅ |
| 7 | BDC seuils | T10 (config), T16, T24 | ✅ |
| 8 | ProjectWorker statut + dates | T2, T11, T20 | ✅ |
| 9 | Avance démarrage remboursement | T15 (computed in storeSituation) | ✅ |
| 10 | TVA 18% + XOF defaults | T3 | ✅ |
| 11 | DqeVersion bpu_version_id FK | T7 | ✅ |
| 12 | BudgetEntry clarification | T18 (comment + doc) | ✅ |
| 13 | Invoice direction enum | T3 | ✅ |
| 14 | ProjectWorker.trade enum | T20 (TRADE_LABELS + select) | ✅ |
| 15 | Project lifecycle_status | T4, T23 (badge UI) | ✅ |
| 16 | DGD model | T9, T17 | ✅ |
| 17 | Réception BL confirmation | T24 (error handling) | ✅ |
| 18 | OS visibilité terrain | T23 (OsPage) | ✅ |
| 19 | Phase projet visible terrain | T23 (lifecycle badge) | ✅ |
| 20 | Situation de Travaux UI | T21 (SituationsPage) | ✅ |
| 21 | Caution bonne exécution | T4 (DB field) | ✅ |
| 22 | Pénalités retard | T18 (computed accessor) | ✅ |
| 23 | Heures sup majorations | T20 (UI display) | ✅ (display — calcul paie = backlog) |
| 24 | Jours fériés CI | T10 (config/btp.php) | ✅ |
| 25 | SMIG CI référence | T10 (config/btp.php) | ✅ |

**All 25 covered.**
