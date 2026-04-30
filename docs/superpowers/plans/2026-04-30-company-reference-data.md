# Company Reference Data Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the company-level reference data layer — units of measure, work lots, cost codes, article library (DQ items), and static enum values — that DQE, execution, and cost modules will inherit.

**Architecture:** Extend the existing Laravel API with 5 new migrations, seeders, models, and CRUD endpoints on top of the Platform Foundation. Companion frontend settings pages let authorized users manage work lots, cost codes, and the article library. Global tables (units, reference_values) are seeded read-only. Company-scoped tables (work_lots, cost_codes, dq_items) support full CRUD. All routes live under the existing `auth` middleware group.

**Tech Stack:** Laravel 12, PHP 8.3+, PostgreSQL, Pest, React 18, TypeScript, Vite, TanStack Query, Axios

---

## Before Starting

Create an isolated worktree for this feature branch:

```bash
git worktree add .worktrees/company-reference-data -b feat/company-reference-data
cd .worktrees/company-reference-data
```

All work in this plan happens inside `.worktrees/company-reference-data/`.

---

## Scope

This plan covers only `Company Reference Data`. The module sequence is:

1. Platform Foundation ✅
2. **Company Reference Data** ← this plan
3. Projects & Technical Base
4. DQE Engine v1
5. Execution & Daily Logs
6. Costs & Payments
7. QSE
8. Reporting & Exports

---

## File Structure

### Backend — New Files

- Create: `backend/app/Models/Unit.php`
- Create: `backend/app/Models/WorkLot.php`
- Create: `backend/app/Models/CostCode.php`
- Create: `backend/app/Models/DqItem.php`
- Create: `backend/app/Models/ReferenceValue.php`
- Create: `backend/app/Http/Controllers/UnitController.php`
- Create: `backend/app/Http/Controllers/WorkLotController.php`
- Create: `backend/app/Http/Controllers/CostCodeController.php`
- Create: `backend/app/Http/Controllers/DqItemController.php`
- Create: `backend/app/Http/Controllers/ReferenceValueController.php`
- Create: `backend/app/Http/Requests/StoreWorkLotRequest.php`
- Create: `backend/app/Http/Requests/UpdateWorkLotRequest.php`
- Create: `backend/app/Http/Requests/StoreCostCodeRequest.php`
- Create: `backend/app/Http/Requests/UpdateCostCodeRequest.php`
- Create: `backend/app/Http/Requests/StoreDqItemRequest.php`
- Create: `backend/app/Http/Requests/UpdateDqItemRequest.php`
- Create: `backend/database/migrations/2026_04_30_200001_create_units_table.php`
- Create: `backend/database/migrations/2026_04_30_200002_create_work_lots_table.php`
- Create: `backend/database/migrations/2026_04_30_200003_create_cost_codes_table.php`
- Create: `backend/database/migrations/2026_04_30_200004_create_dq_items_table.php`
- Create: `backend/database/migrations/2026_04_30_200005_create_reference_values_table.php`
- Create: `backend/database/factories/UnitFactory.php`
- Create: `backend/database/factories/WorkLotFactory.php`
- Create: `backend/database/factories/CostCodeFactory.php`
- Create: `backend/database/factories/DqItemFactory.php`
- Create: `backend/database/seeders/UnitSeeder.php`
- Create: `backend/database/seeders/ReferenceValueSeeder.php`
- Modify: `backend/database/seeders/DatabaseSeeder.php`
- Modify: `backend/routes/api.php`
- Modify: `backend/tests/Pest.php`

### Backend — Test Files

- Create: `backend/tests/Feature/Units/UnitIndexTest.php`
- Create: `backend/tests/Feature/WorkLots/WorkLotIndexTest.php`
- Create: `backend/tests/Feature/WorkLots/WorkLotStoreTest.php`
- Create: `backend/tests/Feature/CostCodes/CostCodeIndexTest.php`
- Create: `backend/tests/Feature/CostCodes/CostCodeStoreTest.php`
- Create: `backend/tests/Feature/DqItems/DqItemIndexTest.php`
- Create: `backend/tests/Feature/DqItems/DqItemStoreTest.php`
- Create: `backend/tests/Feature/ReferenceValues/ReferenceValueIndexTest.php`

### Frontend — New Files

- Create: `frontend/src/features/settings/types.ts`
- Create: `frontend/src/features/settings/api/units.ts`
- Create: `frontend/src/features/settings/api/work-lots.ts`
- Create: `frontend/src/features/settings/api/cost-codes.ts`
- Create: `frontend/src/features/settings/api/dq-items.ts`
- Create: `frontend/src/features/settings/components/WorkLotList.tsx`
- Create: `frontend/src/features/settings/components/WorkLotForm.tsx`
- Create: `frontend/src/features/settings/components/DqItemTable.tsx`
- Create: `frontend/src/features/settings/components/DqItemForm.tsx`
- Create: `frontend/src/features/settings/pages/SettingsPage.tsx`
- Create: `frontend/src/features/settings/pages/WorkLotsPage.tsx`
- Create: `frontend/src/features/settings/pages/DqItemsPage.tsx`
- Modify: `frontend/src/main.tsx`
- Modify: `frontend/src/router.tsx`

### Frontend — Test Files

- Create: `frontend/src/features/settings/components/WorkLotList.test.tsx`
- Create: `frontend/src/features/settings/components/DqItemTable.test.tsx`

---

## Data Model

### `units` (global — not company-scoped)

| Column | Type | Notes |
|---|---|---|
| id | bigint PK | |
| code | varchar unique | m², kg, ml, etc. |
| label | varchar | Mètre carré, Kilogramme |
| sort_order | smallint | display ordering |

### `work_lots` (company-scoped)

| Column | Type | Notes |
|---|---|---|
| id | bigint PK | |
| company_id | bigint FK | cascadeOnDelete |
| code | varchar | GO, ELEC, etc. |
| label | varchar | Gros Oeuvre, Électricité |
| sort_order | int | |
| is_active | boolean | default true |
| unique | (company_id, code) | |

### `cost_codes` (company-scoped)

| Column | Type | Notes |
|---|---|---|
| id | bigint PK | |
| company_id | bigint FK | cascadeOnDelete |
| code | varchar | MO, MAT, etc. |
| label | varchar | Main d'oeuvre, Matériaux |
| unique | (company_id, code) | |

### `dq_items` (company-scoped)

| Column | Type | Notes |
|---|---|---|
| id | bigint PK | |
| company_id | bigint FK | cascadeOnDelete |
| work_lot_id | bigint FK | work_lots, cascadeOnDelete |
| unit_id | bigint FK | units, restrictOnDelete |
| code | varchar | GO-001, etc. |
| designation | varchar | Béton dosé 300 kg/m³ |
| unit_price | decimal(15,2) | base price |
| is_active | boolean | default true |
| unique | (company_id, code) | |

### `reference_values` (global — not company-scoped)

| Column | Type | Notes |
|---|---|---|
| id | bigint PK | |
| category | varchar | meteo, type_incident, etc. |
| value | varchar | soleil, pluie, etc. |
| label | varchar | Soleil, Pluie |
| sort_order | int | |

---

## Task 1: Units of Measure

**Files:**
- Create: `backend/database/migrations/2026_04_30_200001_create_units_table.php`
- Create: `backend/app/Models/Unit.php`
- Create: `backend/database/factories/UnitFactory.php`
- Create: `backend/database/seeders/UnitSeeder.php`
- Create: `backend/app/Http/Controllers/UnitController.php`
- Modify: `backend/database/seeders/DatabaseSeeder.php`
- Modify: `backend/routes/api.php`
- Modify: `backend/tests/Pest.php`
- Test: `backend/tests/Feature/Units/UnitIndexTest.php`

- [ ] **Step 1: Write the failing units test**

Create `backend/tests/Feature/Units/UnitIndexTest.php`:

```php
<?php

use App\Models\Company;
use App\Models\Role;
use App\Models\User;

it('lists all seeded units for authenticated users', function () {
    $company = Company::factory()->create();
    $role = Role::query()->first();
    $user = User::factory()->create([
        'company_id' => $company->id,
        'role_id' => $role->id,
    ]);

    $response = $this->actingAs($user)->getJson('/api/units');

    $response
        ->assertOk()
        ->assertJsonStructure(['data' => [['id', 'code', 'label', 'sort_order']]])
        ->assertJsonCount(11, 'data');
});

it('denies unauthenticated access to units', function () {
    $response = $this->getJson('/api/units');
    $response->assertUnauthorized();
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd backend && php artisan test tests/Feature/Units/UnitIndexTest.php
```

Expected:

```text
FAIL
404
```

- [ ] **Step 3: Create the migration**

Create `backend/database/migrations/2026_04_30_200001_create_units_table.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('units', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique();
            $table->string('label');
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('units');
    }
};
```

- [ ] **Step 4: Create the model and factory**

Create `backend/app/Models/Unit.php`:

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Unit extends Model
{
    use HasFactory;

    protected $fillable = ['code', 'label', 'sort_order'];
}
```

Create `backend/database/factories/UnitFactory.php`:

```php
<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

class UnitFactory extends Factory
{
    public function definition(): array
    {
        return [
            'code' => $this->faker->unique()->lexify('??'),
            'label' => $this->faker->word(),
            'sort_order' => $this->faker->numberBetween(1, 100),
        ];
    }
}
```

- [ ] **Step 5: Create the seeder**

Create `backend/database/seeders/UnitSeeder.php`:

```php
<?php

namespace Database\Seeders;

use App\Models\Unit;
use Illuminate\Database\Seeder;

class UnitSeeder extends Seeder
{
    public function run(): void
    {
        $units = [
            ['code' => 'u',       'label' => 'Unité',            'sort_order' => 1],
            ['code' => 'ml',      'label' => 'Mètre linéaire',   'sort_order' => 2],
            ['code' => 'm²',      'label' => 'Mètre carré',      'sort_order' => 3],
            ['code' => 'm³',      'label' => 'Mètre cube',       'sort_order' => 4],
            ['code' => 'kg',      'label' => 'Kilogramme',       'sort_order' => 5],
            ['code' => 't',       'label' => 'Tonne',            'sort_order' => 6],
            ['code' => 'l',       'label' => 'Litre',            'sort_order' => 7],
            ['code' => 'sac',     'label' => 'Sac (40 kg)',      'sort_order' => 8],
            ['code' => 'forfait', 'label' => 'Forfait',          'sort_order' => 9],
            ['code' => 'h',       'label' => 'Heure',            'sort_order' => 10],
            ['code' => 'j',       'label' => 'Jour',             'sort_order' => 11],
        ];

        foreach ($units as $unit) {
            Unit::query()->updateOrCreate(
                ['code' => $unit['code']],
                ['label' => $unit['label'], 'sort_order' => $unit['sort_order']]
            );
        }
    }
}
```

- [ ] **Step 6: Update DatabaseSeeder**

Modify `backend/database/seeders/DatabaseSeeder.php`:

```php
<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            RoleSeeder::class,
            UnitSeeder::class,
        ]);
    }
}
```

- [ ] **Step 7: Update Pest.php to seed units in tests**

Modify `backend/tests/Pest.php`:

```php
<?php

uses(Tests\TestCase::class, Illuminate\Foundation\Testing\RefreshDatabase::class)
    ->beforeEach(function () {
        \Illuminate\Support\Facades\Artisan::call('db:seed', ['--class' => 'RoleSeeder']);
        \Illuminate\Support\Facades\Artisan::call('db:seed', ['--class' => 'UnitSeeder']);
    })
    ->in('Feature');
```

- [ ] **Step 8: Create the controller**

Create `backend/app/Http/Controllers/UnitController.php`:

```php
<?php

namespace App\Http\Controllers;

use App\Models\Unit;
use Illuminate\Http\JsonResponse;

class UnitController extends Controller
{
    public function index(): JsonResponse
    {
        $units = Unit::query()
            ->orderBy('sort_order')
            ->get();

        return response()->json(['data' => $units]);
    }
}
```

- [ ] **Step 9: Register the route**

Modify `backend/routes/api.php` — show the full file:

```php
<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\ProjectController;
use App\Http\Controllers\UnitController;
use Illuminate\Support\Facades\Route;

Route::get('/health', function () {
    return response()->json([
        'status' => 'ok',
        'app' => config('app.name'),
        'timestamp' => now()->toIso8601String(),
    ]);
});

Route::prefix('auth')->group(function () {
    Route::post('/login', [AuthController::class, 'login']);

    Route::middleware('auth')->group(function () {
        Route::get('/me', [AuthController::class, 'me']);
        Route::post('/logout', [AuthController::class, 'logout']);
    });
});

Route::middleware('auth')->group(function () {
    Route::get('/units', [UnitController::class, 'index']);

    Route::get('/projects', [ProjectController::class, 'index']);
    Route::post('/projects', [ProjectController::class, 'store']);
    Route::put('/projects/{project}', [ProjectController::class, 'update']);
});
```

- [ ] **Step 10: Run migration and verify the test passes**

```bash
cd backend && php artisan migrate
cd backend && php artisan test tests/Feature/Units/UnitIndexTest.php
```

Expected:

```text
PASS  Tests\Feature\Units\UnitIndexTest
✓ lists all seeded units for authenticated users
✓ denies unauthenticated access to units
```

- [ ] **Step 11: Verify all existing tests still pass**

```bash
cd backend && php artisan test --testsuite=Feature
```

Expected:

```text
PASS
Tests: 9 passed
```

- [ ] **Step 12: Commit**

```bash
git add backend/app/Models/Unit.php \
        backend/database/factories/UnitFactory.php \
        backend/database/migrations/2026_04_30_200001_create_units_table.php \
        backend/database/seeders/UnitSeeder.php \
        backend/database/seeders/DatabaseSeeder.php \
        backend/app/Http/Controllers/UnitController.php \
        backend/routes/api.php \
        backend/tests/Pest.php \
        backend/tests/Feature/Units/UnitIndexTest.php
git commit -m "feat: add units of measure table, seeder, and read api"
```

---

## Task 2: Work Lots

**Files:**
- Create: `backend/database/migrations/2026_04_30_200002_create_work_lots_table.php`
- Create: `backend/app/Models/WorkLot.php`
- Create: `backend/database/factories/WorkLotFactory.php`
- Create: `backend/app/Http/Requests/StoreWorkLotRequest.php`
- Create: `backend/app/Http/Requests/UpdateWorkLotRequest.php`
- Create: `backend/app/Http/Controllers/WorkLotController.php`
- Modify: `backend/routes/api.php`
- Test: `backend/tests/Feature/WorkLots/WorkLotIndexTest.php`
- Test: `backend/tests/Feature/WorkLots/WorkLotStoreTest.php`

- [ ] **Step 1: Write the failing work lot tests**

Create `backend/tests/Feature/WorkLots/WorkLotIndexTest.php`:

```php
<?php

use App\Models\Company;
use App\Models\Role;
use App\Models\User;
use App\Models\WorkLot;

it('lists only work lots belonging to the authenticated user company', function () {
    $companyA = Company::factory()->create();
    $companyB = Company::factory()->create();
    $role = Role::query()->first();

    $user = User::factory()->create([
        'company_id' => $companyA->id,
        'role_id' => $role->id,
    ]);

    WorkLot::factory()->count(3)->create(['company_id' => $companyA->id]);
    WorkLot::factory()->count(2)->create(['company_id' => $companyB->id]);

    $response = $this->actingAs($user)->getJson('/api/work-lots');

    $response
        ->assertOk()
        ->assertJsonCount(3, 'data');
});

it('returns work lots ordered by sort_order', function () {
    $company = Company::factory()->create();
    $role = Role::query()->first();
    $user = User::factory()->create(['company_id' => $company->id, 'role_id' => $role->id]);

    WorkLot::factory()->create(['company_id' => $company->id, 'code' => 'C', 'sort_order' => 3]);
    WorkLot::factory()->create(['company_id' => $company->id, 'code' => 'A', 'sort_order' => 1]);
    WorkLot::factory()->create(['company_id' => $company->id, 'code' => 'B', 'sort_order' => 2]);

    $response = $this->actingAs($user)->getJson('/api/work-lots');

    $response
        ->assertOk()
        ->assertJsonPath('data.0.code', 'A')
        ->assertJsonPath('data.1.code', 'B')
        ->assertJsonPath('data.2.code', 'C');
});
```

Create `backend/tests/Feature/WorkLots/WorkLotStoreTest.php`:

```php
<?php

use App\Models\Company;
use App\Models\Role;
use App\Models\User;

it('creates a work lot for the authenticated user company', function () {
    $company = Company::factory()->create();
    $role = Role::query()->first();
    $user = User::factory()->create([
        'company_id' => $company->id,
        'role_id' => $role->id,
    ]);

    $response = $this->actingAs($user)->postJson('/api/work-lots', [
        'code' => 'GO',
        'label' => 'Gros Oeuvre',
        'sort_order' => 1,
    ]);

    $response
        ->assertCreated()
        ->assertJsonPath('data.code', 'GO')
        ->assertJsonPath('data.label', 'Gros Oeuvre')
        ->assertJsonPath('data.company_id', $company->id);

    $this->assertDatabaseHas('work_lots', [
        'company_id' => $company->id,
        'code' => 'GO',
    ]);
});

it('rejects a work lot with a duplicate code in the same company', function () {
    $company = Company::factory()->create();
    $role = Role::query()->first();
    $user = User::factory()->create(['company_id' => $company->id, 'role_id' => $role->id]);

    \App\Models\WorkLot::factory()->create([
        'company_id' => $company->id,
        'code' => 'GO',
    ]);

    $response = $this->actingAs($user)->postJson('/api/work-lots', [
        'code' => 'GO',
        'label' => 'Duplicate',
    ]);

    $response->assertUnprocessable();
});
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
cd backend && php artisan test tests/Feature/WorkLots/
```

Expected:

```text
FAIL
404
```

- [ ] **Step 3: Create the migration**

Create `backend/database/migrations/2026_04_30_200002_create_work_lots_table.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('work_lots', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->string('code', 50);
            $table->string('label');
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['company_id', 'code']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('work_lots');
    }
};
```

- [ ] **Step 4: Create the model and factory**

Create `backend/app/Models/WorkLot.php`:

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class WorkLot extends Model
{
    use HasFactory;

    protected $fillable = [
        'company_id',
        'code',
        'label',
        'sort_order',
        'is_active',
    ];

    protected function casts(): array
    {
        return ['is_active' => 'boolean'];
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function dqItems(): HasMany
    {
        return $this->hasMany(DqItem::class);
    }
}
```

Create `backend/database/factories/WorkLotFactory.php`:

```php
<?php

namespace Database\Factories;

use App\Models\Company;
use Illuminate\Database\Eloquent\Factories\Factory;

class WorkLotFactory extends Factory
{
    public function definition(): array
    {
        return [
            'company_id' => Company::factory(),
            'code'       => strtoupper($this->faker->unique()->lexify('????')),
            'label'      => ucfirst($this->faker->words(2, true)),
            'sort_order' => $this->faker->numberBetween(1, 100),
            'is_active'  => true,
        ];
    }
}
```

- [ ] **Step 5: Create request validation classes**

Create `backend/app/Http/Requests/StoreWorkLotRequest.php`:

```php
<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreWorkLotRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'code'       => ['required', 'string', 'max:50'],
            'label'      => ['required', 'string', 'max:255'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
            'is_active'  => ['nullable', 'boolean'],
        ];
    }
}
```

Create `backend/app/Http/Requests/UpdateWorkLotRequest.php`:

```php
<?php

namespace App\Http\Requests;

class UpdateWorkLotRequest extends StoreWorkLotRequest
{
}
```

- [ ] **Step 6: Create the controller**

Create `backend/app/Http/Controllers/WorkLotController.php`:

```php
<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreWorkLotRequest;
use App\Http\Requests\UpdateWorkLotRequest;
use App\Models\WorkLot;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class WorkLotController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $lots = WorkLot::query()
            ->where('company_id', $request->user()->company_id)
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->orderBy('code')
            ->get();

        return response()->json(['data' => $lots]);
    }

    public function store(StoreWorkLotRequest $request): JsonResponse
    {
        $exists = WorkLot::query()
            ->where('company_id', $request->user()->company_id)
            ->where('code', $request->validated()['code'])
            ->exists();

        if ($exists) {
            throw ValidationException::withMessages([
                'code' => ['A work lot with this code already exists for your company.'],
            ]);
        }

        $lot = WorkLot::query()->create([
            ...$request->validated(),
            'company_id' => $request->user()->company_id,
        ]);

        return response()->json(['data' => $lot], 201);
    }

    public function update(UpdateWorkLotRequest $request, WorkLot $workLot): JsonResponse
    {
        abort_unless($workLot->company_id === $request->user()->company_id, 403);

        $workLot->update($request->validated());

        return response()->json(['data' => $workLot->fresh()]);
    }
}
```

- [ ] **Step 7: Register the routes**

Modify `backend/routes/api.php` — full file:

```php
<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\ProjectController;
use App\Http\Controllers\UnitController;
use App\Http\Controllers\WorkLotController;
use Illuminate\Support\Facades\Route;

Route::get('/health', function () {
    return response()->json([
        'status' => 'ok',
        'app' => config('app.name'),
        'timestamp' => now()->toIso8601String(),
    ]);
});

Route::prefix('auth')->group(function () {
    Route::post('/login', [AuthController::class, 'login']);

    Route::middleware('auth')->group(function () {
        Route::get('/me', [AuthController::class, 'me']);
        Route::post('/logout', [AuthController::class, 'logout']);
    });
});

Route::middleware('auth')->group(function () {
    Route::get('/units', [UnitController::class, 'index']);

    Route::get('/work-lots', [WorkLotController::class, 'index']);
    Route::post('/work-lots', [WorkLotController::class, 'store']);
    Route::put('/work-lots/{workLot}', [WorkLotController::class, 'update']);

    Route::get('/projects', [ProjectController::class, 'index']);
    Route::post('/projects', [ProjectController::class, 'store']);
    Route::put('/projects/{project}', [ProjectController::class, 'update']);
});
```

- [ ] **Step 8: Run migration and verify the tests pass**

```bash
cd backend && php artisan migrate
cd backend && php artisan test tests/Feature/WorkLots/
```

Expected:

```text
PASS  Tests\Feature\WorkLots\WorkLotIndexTest
✓ lists only work lots belonging to the authenticated user company
✓ returns work lots ordered by sort_order
PASS  Tests\Feature\WorkLots\WorkLotStoreTest
✓ creates a work lot for the authenticated user company
✓ rejects a work lot with a duplicate code in the same company
```

- [ ] **Step 9: Verify all tests pass**

```bash
cd backend && php artisan test --testsuite=Feature
```

Expected:

```text
Tests: 13 passed
```

- [ ] **Step 10: Commit**

```bash
git add backend/app/Models/WorkLot.php \
        backend/database/factories/WorkLotFactory.php \
        backend/database/migrations/2026_04_30_200002_create_work_lots_table.php \
        backend/app/Http/Requests/StoreWorkLotRequest.php \
        backend/app/Http/Requests/UpdateWorkLotRequest.php \
        backend/app/Http/Controllers/WorkLotController.php \
        backend/routes/api.php \
        backend/tests/Feature/WorkLots/
git commit -m "feat: add work lots crud api"
```

---

## Task 3: Cost Codes

**Files:**
- Create: `backend/database/migrations/2026_04_30_200003_create_cost_codes_table.php`
- Create: `backend/app/Models/CostCode.php`
- Create: `backend/database/factories/CostCodeFactory.php`
- Create: `backend/app/Http/Requests/StoreCostCodeRequest.php`
- Create: `backend/app/Http/Requests/UpdateCostCodeRequest.php`
- Create: `backend/app/Http/Controllers/CostCodeController.php`
- Modify: `backend/routes/api.php`
- Test: `backend/tests/Feature/CostCodes/CostCodeIndexTest.php`
- Test: `backend/tests/Feature/CostCodes/CostCodeStoreTest.php`

- [ ] **Step 1: Write the failing cost code tests**

Create `backend/tests/Feature/CostCodes/CostCodeIndexTest.php`:

```php
<?php

use App\Models\Company;
use App\Models\CostCode;
use App\Models\Role;
use App\Models\User;

it('lists only cost codes belonging to the authenticated user company', function () {
    $companyA = Company::factory()->create();
    $companyB = Company::factory()->create();
    $role = Role::query()->first();

    $user = User::factory()->create([
        'company_id' => $companyA->id,
        'role_id' => $role->id,
    ]);

    CostCode::factory()->count(4)->create(['company_id' => $companyA->id]);
    CostCode::factory()->count(2)->create(['company_id' => $companyB->id]);

    $response = $this->actingAs($user)->getJson('/api/cost-codes');

    $response
        ->assertOk()
        ->assertJsonCount(4, 'data');
});
```

Create `backend/tests/Feature/CostCodes/CostCodeStoreTest.php`:

```php
<?php

use App\Models\Company;
use App\Models\Role;
use App\Models\User;

it('creates a cost code for the authenticated user company', function () {
    $company = Company::factory()->create();
    $role = Role::query()->first();
    $user = User::factory()->create([
        'company_id' => $company->id,
        'role_id' => $role->id,
    ]);

    $response = $this->actingAs($user)->postJson('/api/cost-codes', [
        'code' => 'MO',
        'label' => "Main d'oeuvre",
    ]);

    $response
        ->assertCreated()
        ->assertJsonPath('data.code', 'MO')
        ->assertJsonPath('data.company_id', $company->id);

    $this->assertDatabaseHas('cost_codes', [
        'company_id' => $company->id,
        'code' => 'MO',
    ]);
});

it('rejects a cost code with a duplicate code in the same company', function () {
    $company = Company::factory()->create();
    $role = Role::query()->first();
    $user = User::factory()->create(['company_id' => $company->id, 'role_id' => $role->id]);

    \App\Models\CostCode::factory()->create([
        'company_id' => $company->id,
        'code' => 'MO',
    ]);

    $response = $this->actingAs($user)->postJson('/api/cost-codes', [
        'code' => 'MO',
        'label' => 'Duplicate',
    ]);

    $response->assertUnprocessable();
});
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
cd backend && php artisan test tests/Feature/CostCodes/
```

Expected:

```text
FAIL
404
```

- [ ] **Step 3: Create the migration**

Create `backend/database/migrations/2026_04_30_200003_create_cost_codes_table.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('cost_codes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->string('code', 50);
            $table->string('label');
            $table->timestamps();

            $table->unique(['company_id', 'code']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cost_codes');
    }
};
```

- [ ] **Step 4: Create the model and factory**

Create `backend/app/Models/CostCode.php`:

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CostCode extends Model
{
    use HasFactory;

    protected $fillable = ['company_id', 'code', 'label'];

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }
}
```

Create `backend/database/factories/CostCodeFactory.php`:

```php
<?php

namespace Database\Factories;

use App\Models\Company;
use Illuminate\Database\Eloquent\Factories\Factory;

class CostCodeFactory extends Factory
{
    public function definition(): array
    {
        return [
            'company_id' => Company::factory(),
            'code'       => strtoupper($this->faker->unique()->lexify('????')),
            'label'      => ucfirst($this->faker->words(2, true)),
        ];
    }
}
```

- [ ] **Step 5: Create request validation classes**

Create `backend/app/Http/Requests/StoreCostCodeRequest.php`:

```php
<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreCostCodeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'code'  => ['required', 'string', 'max:50'],
            'label' => ['required', 'string', 'max:255'],
        ];
    }
}
```

Create `backend/app/Http/Requests/UpdateCostCodeRequest.php`:

```php
<?php

namespace App\Http\Requests;

class UpdateCostCodeRequest extends StoreCostCodeRequest
{
}
```

- [ ] **Step 6: Create the controller**

Create `backend/app/Http/Controllers/CostCodeController.php`:

```php
<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreCostCodeRequest;
use App\Http\Requests\UpdateCostCodeRequest;
use App\Models\CostCode;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class CostCodeController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $codes = CostCode::query()
            ->where('company_id', $request->user()->company_id)
            ->orderBy('code')
            ->get();

        return response()->json(['data' => $codes]);
    }

    public function store(StoreCostCodeRequest $request): JsonResponse
    {
        $exists = CostCode::query()
            ->where('company_id', $request->user()->company_id)
            ->where('code', $request->validated()['code'])
            ->exists();

        if ($exists) {
            throw ValidationException::withMessages([
                'code' => ['A cost code with this code already exists for your company.'],
            ]);
        }

        $code = CostCode::query()->create([
            ...$request->validated(),
            'company_id' => $request->user()->company_id,
        ]);

        return response()->json(['data' => $code], 201);
    }

    public function update(UpdateCostCodeRequest $request, CostCode $costCode): JsonResponse
    {
        abort_unless($costCode->company_id === $request->user()->company_id, 403);

        $costCode->update($request->validated());

        return response()->json(['data' => $costCode->fresh()]);
    }
}
```

- [ ] **Step 7: Register the routes**

Modify `backend/routes/api.php` — full file:

```php
<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\CostCodeController;
use App\Http\Controllers\ProjectController;
use App\Http\Controllers\UnitController;
use App\Http\Controllers\WorkLotController;
use Illuminate\Support\Facades\Route;

Route::get('/health', function () {
    return response()->json([
        'status' => 'ok',
        'app' => config('app.name'),
        'timestamp' => now()->toIso8601String(),
    ]);
});

Route::prefix('auth')->group(function () {
    Route::post('/login', [AuthController::class, 'login']);

    Route::middleware('auth')->group(function () {
        Route::get('/me', [AuthController::class, 'me']);
        Route::post('/logout', [AuthController::class, 'logout']);
    });
});

Route::middleware('auth')->group(function () {
    Route::get('/units', [UnitController::class, 'index']);

    Route::get('/work-lots', [WorkLotController::class, 'index']);
    Route::post('/work-lots', [WorkLotController::class, 'store']);
    Route::put('/work-lots/{workLot}', [WorkLotController::class, 'update']);

    Route::get('/cost-codes', [CostCodeController::class, 'index']);
    Route::post('/cost-codes', [CostCodeController::class, 'store']);
    Route::put('/cost-codes/{costCode}', [CostCodeController::class, 'update']);

    Route::get('/projects', [ProjectController::class, 'index']);
    Route::post('/projects', [ProjectController::class, 'store']);
    Route::put('/projects/{project}', [ProjectController::class, 'update']);
});
```

- [ ] **Step 8: Run migration and verify the tests pass**

```bash
cd backend && php artisan migrate
cd backend && php artisan test tests/Feature/CostCodes/
```

Expected:

```text
PASS  Tests\Feature\CostCodes\CostCodeIndexTest
✓ lists only cost codes belonging to the authenticated user company
PASS  Tests\Feature\CostCodes\CostCodeStoreTest
✓ creates a cost code for the authenticated user company
✓ rejects a cost code with a duplicate code in the same company
```

- [ ] **Step 9: Verify all tests pass**

```bash
cd backend && php artisan test --testsuite=Feature
```

Expected:

```text
Tests: 16 passed
```

- [ ] **Step 10: Commit**

```bash
git add backend/app/Models/CostCode.php \
        backend/database/factories/CostCodeFactory.php \
        backend/database/migrations/2026_04_30_200003_create_cost_codes_table.php \
        backend/app/Http/Requests/StoreCostCodeRequest.php \
        backend/app/Http/Requests/UpdateCostCodeRequest.php \
        backend/app/Http/Controllers/CostCodeController.php \
        backend/routes/api.php \
        backend/tests/Feature/CostCodes/
git commit -m "feat: add cost codes crud api"
```

---

## Task 4: DQ Items — Article Library

**Files:**
- Create: `backend/database/migrations/2026_04_30_200004_create_dq_items_table.php`
- Create: `backend/app/Models/DqItem.php`
- Create: `backend/database/factories/DqItemFactory.php`
- Create: `backend/app/Http/Requests/StoreDqItemRequest.php`
- Create: `backend/app/Http/Requests/UpdateDqItemRequest.php`
- Create: `backend/app/Http/Controllers/DqItemController.php`
- Modify: `backend/routes/api.php`
- Test: `backend/tests/Feature/DqItems/DqItemIndexTest.php`
- Test: `backend/tests/Feature/DqItems/DqItemStoreTest.php`

- [ ] **Step 1: Write the failing DQ item tests**

Create `backend/tests/Feature/DqItems/DqItemIndexTest.php`:

```php
<?php

use App\Models\Company;
use App\Models\DqItem;
use App\Models\Role;
use App\Models\Unit;
use App\Models\User;
use App\Models\WorkLot;

it('lists only dq items belonging to the authenticated user company', function () {
    $companyA = Company::factory()->create();
    $companyB = Company::factory()->create();
    $role = Role::query()->first();
    $unit = Unit::query()->first();

    $user = User::factory()->create([
        'company_id' => $companyA->id,
        'role_id' => $role->id,
    ]);

    $lotA = WorkLot::factory()->create(['company_id' => $companyA->id]);
    $lotB = WorkLot::factory()->create(['company_id' => $companyB->id]);

    DqItem::factory()->count(3)->create([
        'company_id' => $companyA->id,
        'work_lot_id' => $lotA->id,
        'unit_id' => $unit->id,
    ]);
    DqItem::factory()->count(2)->create([
        'company_id' => $companyB->id,
        'work_lot_id' => $lotB->id,
        'unit_id' => $unit->id,
    ]);

    $response = $this->actingAs($user)->getJson('/api/dq-items');

    $response
        ->assertOk()
        ->assertJsonCount(3, 'data');
});

it('filters dq items by work lot id', function () {
    $company = Company::factory()->create();
    $role = Role::query()->first();
    $unit = Unit::query()->first();
    $user = User::factory()->create(['company_id' => $company->id, 'role_id' => $role->id]);

    $lotA = WorkLot::factory()->create(['company_id' => $company->id]);
    $lotB = WorkLot::factory()->create(['company_id' => $company->id]);

    $itemA = DqItem::factory()->create([
        'company_id' => $company->id,
        'work_lot_id' => $lotA->id,
        'unit_id' => $unit->id,
    ]);
    DqItem::factory()->create([
        'company_id' => $company->id,
        'work_lot_id' => $lotB->id,
        'unit_id' => $unit->id,
    ]);

    $response = $this->actingAs($user)->getJson("/api/dq-items?work_lot_id={$lotA->id}");

    $response
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.id', $itemA->id);
});

it('eager loads work_lot and unit on dq item index', function () {
    $company = Company::factory()->create();
    $role = Role::query()->first();
    $unit = Unit::query()->first();
    $user = User::factory()->create(['company_id' => $company->id, 'role_id' => $role->id]);
    $lot = WorkLot::factory()->create(['company_id' => $company->id]);

    DqItem::factory()->create([
        'company_id' => $company->id,
        'work_lot_id' => $lot->id,
        'unit_id' => $unit->id,
    ]);

    $response = $this->actingAs($user)->getJson('/api/dq-items');

    $response
        ->assertOk()
        ->assertJsonStructure(['data' => [['id', 'code', 'designation', 'unit_price', 'work_lot', 'unit']]]);
});
```

Create `backend/tests/Feature/DqItems/DqItemStoreTest.php`:

```php
<?php

use App\Models\Company;
use App\Models\Role;
use App\Models\Unit;
use App\Models\User;
use App\Models\WorkLot;

it('creates a dq item linked to a work lot and unit', function () {
    $company = Company::factory()->create();
    $role = Role::query()->first();
    $unit = Unit::query()->first();
    $user = User::factory()->create(['company_id' => $company->id, 'role_id' => $role->id]);
    $lot = WorkLot::factory()->create(['company_id' => $company->id]);

    $response = $this->actingAs($user)->postJson('/api/dq-items', [
        'work_lot_id' => $lot->id,
        'unit_id'     => $unit->id,
        'code'        => 'GO-001',
        'designation' => 'Béton dosé 300 kg/m³',
        'unit_price'  => 85000,
    ]);

    $response
        ->assertCreated()
        ->assertJsonPath('data.code', 'GO-001')
        ->assertJsonPath('data.company_id', $company->id)
        ->assertJsonPath('data.work_lot_id', $lot->id)
        ->assertJsonPath('data.unit_id', $unit->id);

    $this->assertDatabaseHas('dq_items', [
        'company_id'  => $company->id,
        'code'        => 'GO-001',
        'designation' => 'Béton dosé 300 kg/m³',
    ]);
});

it('rejects a dq item referencing a work lot from another company', function () {
    $companyA = Company::factory()->create();
    $companyB = Company::factory()->create();
    $role = Role::query()->first();
    $unit = Unit::query()->first();
    $user = User::factory()->create(['company_id' => $companyA->id, 'role_id' => $role->id]);

    $foreignLot = WorkLot::factory()->create(['company_id' => $companyB->id]);

    $response = $this->actingAs($user)->postJson('/api/dq-items', [
        'work_lot_id' => $foreignLot->id,
        'unit_id'     => $unit->id,
        'code'        => 'XX-001',
        'designation' => 'Test',
        'unit_price'  => 1000,
    ]);

    $response->assertForbidden();
});
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
cd backend && php artisan test tests/Feature/DqItems/
```

Expected:

```text
FAIL
404
```

- [ ] **Step 3: Create the migration**

Create `backend/database/migrations/2026_04_30_200004_create_dq_items_table.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('dq_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('work_lot_id')->constrained('work_lots')->cascadeOnDelete();
            $table->foreignId('unit_id')->constrained('units')->restrictOnDelete();
            $table->string('code', 50);
            $table->string('designation');
            $table->decimal('unit_price', 15, 2)->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['company_id', 'code']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('dq_items');
    }
};
```

- [ ] **Step 4: Create the model and factory**

Create `backend/app/Models/DqItem.php`:

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DqItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'company_id',
        'work_lot_id',
        'unit_id',
        'code',
        'designation',
        'unit_price',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'unit_price' => 'decimal:2',
            'is_active'  => 'boolean',
        ];
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function workLot(): BelongsTo
    {
        return $this->belongsTo(WorkLot::class);
    }

    public function unit(): BelongsTo
    {
        return $this->belongsTo(Unit::class);
    }
}
```

Create `backend/database/factories/DqItemFactory.php`:

```php
<?php

namespace Database\Factories;

use App\Models\Company;
use App\Models\Unit;
use App\Models\WorkLot;
use Illuminate\Database\Eloquent\Factories\Factory;

class DqItemFactory extends Factory
{
    public function definition(): array
    {
        return [
            'company_id'  => Company::factory(),
            'work_lot_id' => WorkLot::factory(),
            'unit_id'     => fn () => Unit::query()->first()?->id ?? Unit::factory()->create()->id,
            'code'        => strtoupper($this->faker->unique()->lexify('?????')),
            'designation' => ucfirst($this->faker->words(3, true)),
            'unit_price'  => $this->faker->randomFloat(2, 100, 100000),
            'is_active'   => true,
        ];
    }
}
```

- [ ] **Step 5: Create request validation classes**

Create `backend/app/Http/Requests/StoreDqItemRequest.php`:

```php
<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreDqItemRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'work_lot_id' => ['required', 'integer', 'exists:work_lots,id'],
            'unit_id'     => ['required', 'integer', 'exists:units,id'],
            'code'        => ['required', 'string', 'max:50'],
            'designation' => ['required', 'string', 'max:255'],
            'unit_price'  => ['required', 'numeric', 'min:0'],
            'is_active'   => ['nullable', 'boolean'],
        ];
    }
}
```

Create `backend/app/Http/Requests/UpdateDqItemRequest.php`:

```php
<?php

namespace App\Http\Requests;

class UpdateDqItemRequest extends StoreDqItemRequest
{
}
```

- [ ] **Step 6: Create the controller**

Create `backend/app/Http/Controllers/DqItemController.php`:

```php
<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreDqItemRequest;
use App\Http\Requests\UpdateDqItemRequest;
use App\Models\DqItem;
use App\Models\WorkLot;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DqItemController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $items = DqItem::query()
            ->where('company_id', $request->user()->company_id)
            ->where('is_active', true)
            ->with(['workLot', 'unit'])
            ->when($request->work_lot_id, fn ($q) => $q->where('work_lot_id', $request->work_lot_id))
            ->orderBy('work_lot_id')
            ->orderBy('code')
            ->get();

        return response()->json(['data' => $items]);
    }

    public function store(StoreDqItemRequest $request): JsonResponse
    {
        $lot = WorkLot::query()->findOrFail($request->validated()['work_lot_id']);

        abort_unless($lot->company_id === $request->user()->company_id, 403);

        $item = DqItem::query()->create([
            ...$request->validated(),
            'company_id' => $request->user()->company_id,
        ]);

        return response()->json(['data' => $item->load(['workLot', 'unit'])], 201);
    }

    public function update(UpdateDqItemRequest $request, DqItem $dqItem): JsonResponse
    {
        abort_unless($dqItem->company_id === $request->user()->company_id, 403);

        $dqItem->update($request->validated());

        return response()->json(['data' => $dqItem->fresh()->load(['workLot', 'unit'])]);
    }
}
```

- [ ] **Step 7: Register the routes**

Modify `backend/routes/api.php` — full file:

```php
<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\CostCodeController;
use App\Http\Controllers\DqItemController;
use App\Http\Controllers\ProjectController;
use App\Http\Controllers\UnitController;
use App\Http\Controllers\WorkLotController;
use Illuminate\Support\Facades\Route;

Route::get('/health', function () {
    return response()->json([
        'status' => 'ok',
        'app' => config('app.name'),
        'timestamp' => now()->toIso8601String(),
    ]);
});

Route::prefix('auth')->group(function () {
    Route::post('/login', [AuthController::class, 'login']);

    Route::middleware('auth')->group(function () {
        Route::get('/me', [AuthController::class, 'me']);
        Route::post('/logout', [AuthController::class, 'logout']);
    });
});

Route::middleware('auth')->group(function () {
    Route::get('/units', [UnitController::class, 'index']);

    Route::get('/work-lots', [WorkLotController::class, 'index']);
    Route::post('/work-lots', [WorkLotController::class, 'store']);
    Route::put('/work-lots/{workLot}', [WorkLotController::class, 'update']);

    Route::get('/cost-codes', [CostCodeController::class, 'index']);
    Route::post('/cost-codes', [CostCodeController::class, 'store']);
    Route::put('/cost-codes/{costCode}', [CostCodeController::class, 'update']);

    Route::get('/dq-items', [DqItemController::class, 'index']);
    Route::post('/dq-items', [DqItemController::class, 'store']);
    Route::put('/dq-items/{dqItem}', [DqItemController::class, 'update']);

    Route::get('/projects', [ProjectController::class, 'index']);
    Route::post('/projects', [ProjectController::class, 'store']);
    Route::put('/projects/{project}', [ProjectController::class, 'update']);
});
```

- [ ] **Step 8: Run migration and verify tests pass**

```bash
cd backend && php artisan migrate
cd backend && php artisan test tests/Feature/DqItems/
```

Expected:

```text
PASS  Tests\Feature\DqItems\DqItemIndexTest
✓ lists only dq items belonging to the authenticated user company
✓ filters dq items by work lot id
✓ eager loads work_lot and unit on dq item index
PASS  Tests\Feature\DqItems\DqItemStoreTest
✓ creates a dq item linked to a work lot and unit
✓ rejects a dq item referencing a work lot from another company
```

- [ ] **Step 9: Verify all tests pass**

```bash
cd backend && php artisan test --testsuite=Feature
```

Expected:

```text
Tests: 21 passed
```

- [ ] **Step 10: Commit**

```bash
git add backend/app/Models/DqItem.php \
        backend/database/factories/DqItemFactory.php \
        backend/database/migrations/2026_04_30_200004_create_dq_items_table.php \
        backend/app/Http/Requests/StoreDqItemRequest.php \
        backend/app/Http/Requests/UpdateDqItemRequest.php \
        backend/app/Http/Controllers/DqItemController.php \
        backend/routes/api.php \
        backend/tests/Feature/DqItems/
git commit -m "feat: add dq items article library crud api"
```

---

## Task 5: Reference Values

**Files:**
- Create: `backend/database/migrations/2026_04_30_200005_create_reference_values_table.php`
- Create: `backend/app/Models/ReferenceValue.php`
- Create: `backend/database/seeders/ReferenceValueSeeder.php`
- Create: `backend/app/Http/Controllers/ReferenceValueController.php`
- Modify: `backend/database/seeders/DatabaseSeeder.php`
- Modify: `backend/routes/api.php`
- Modify: `backend/tests/Pest.php`
- Test: `backend/tests/Feature/ReferenceValues/ReferenceValueIndexTest.php`

- [ ] **Step 1: Write the failing reference value test**

Create `backend/tests/Feature/ReferenceValues/ReferenceValueIndexTest.php`:

```php
<?php

use App\Models\Company;
use App\Models\Role;
use App\Models\User;

it('lists reference values filtered by category', function () {
    $company = Company::factory()->create();
    $role = Role::query()->first();
    $user = User::factory()->create(['company_id' => $company->id, 'role_id' => $role->id]);

    $response = $this->actingAs($user)->getJson('/api/reference-values?category=meteo');

    $response
        ->assertOk()
        ->assertJsonCount(6, 'data');
});

it('lists all reference values when no category filter is applied', function () {
    $company = Company::factory()->create();
    $role = Role::query()->first();
    $user = User::factory()->create(['company_id' => $company->id, 'role_id' => $role->id]);

    $response = $this->actingAs($user)->getJson('/api/reference-values');

    $response
        ->assertOk()
        ->assertJsonStructure(['data' => [['id', 'category', 'value', 'label']]]);
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd backend && php artisan test tests/Feature/ReferenceValues/ReferenceValueIndexTest.php
```

Expected:

```text
FAIL
404
```

- [ ] **Step 3: Create the migration**

Create `backend/database/migrations/2026_04_30_200005_create_reference_values_table.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('reference_values', function (Blueprint $table) {
            $table->id();
            $table->string('category', 50);
            $table->string('value', 100);
            $table->string('label');
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();

            $table->unique(['category', 'value']);
            $table->index('category');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reference_values');
    }
};
```

- [ ] **Step 4: Create the model**

Create `backend/app/Models/ReferenceValue.php`:

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ReferenceValue extends Model
{
    protected $fillable = ['category', 'value', 'label', 'sort_order'];
}
```

- [ ] **Step 5: Create the seeder**

Create `backend/database/seeders/ReferenceValueSeeder.php`:

```php
<?php

namespace Database\Seeders;

use App\Models\ReferenceValue;
use Illuminate\Database\Seeder;

class ReferenceValueSeeder extends Seeder
{
    public function run(): void
    {
        $data = [
            'meteo' => [
                ['value' => 'soleil',     'label' => 'Soleil'],
                ['value' => 'nuageux',    'label' => 'Nuageux'],
                ['value' => 'pluie',      'label' => 'Pluie'],
                ['value' => 'orage',      'label' => 'Orage'],
                ['value' => 'vent_fort',  'label' => 'Vent fort'],
                ['value' => 'autre',      'label' => 'Autre'],
            ],
            'etat_equipement' => [
                ['value' => 'bon',         'label' => 'Bon'],
                ['value' => 'moyen',       'label' => 'Moyen'],
                ['value' => 'mauvais',     'label' => 'Mauvais'],
                ['value' => 'hors_service','label' => 'Hors service'],
            ],
            'type_incident' => [
                ['value' => 'retard',         'label' => 'Retard'],
                ['value' => 'accident',       'label' => 'Accident'],
                ['value' => 'litige',         'label' => 'Litige'],
                ['value' => 'rupture_stock',  'label' => 'Rupture stock'],
                ['value' => 'panne',          'label' => 'Panne'],
                ['value' => 'ras',            'label' => 'RAS'],
                ['value' => 'autre',          'label' => 'Autre'],
            ],
            'type_securite' => [
                ['value' => 'epi_manquant',        'label' => 'EPI manquant'],
                ['value' => 'accident',            'label' => 'Accident'],
                ['value' => 'quasi_accident',      'label' => 'Quasi-accident'],
                ['value' => 'non_respect_consigne','label' => 'Non-respect consigne'],
                ['value' => 'autre',               'label' => 'Autre'],
            ],
            'statut_paiement' => [
                ['value' => 'paye',      'label' => 'Payé'],
                ['value' => 'en_attente','label' => 'En attente'],
                ['value' => 'partiel',   'label' => 'Partiel'],
            ],
            'materiau' => [
                ['value' => 'ciment',    'label' => 'Ciment'],
                ['value' => 'fer',       'label' => 'Fer'],
                ['value' => 'sable',     'label' => 'Sable'],
                ['value' => 'gravier',   'label' => 'Gravier'],
                ['value' => 'briques',   'label' => 'Briques'],
                ['value' => 'bois',      'label' => 'Bois'],
                ['value' => 'carrelage', 'label' => 'Carrelage'],
                ['value' => 'peinture',  'label' => 'Peinture'],
                ['value' => 'autre',     'label' => 'Autre'],
            ],
            'categorie_finance' => [
                ['value' => 'installation',  'label' => 'Installation'],
                ['value' => 'main_oeuvre',   'label' => "Main d'oeuvre"],
                ['value' => 'materiaux',     'label' => 'Matériaux'],
                ['value' => 'transport',     'label' => 'Transport'],
                ['value' => 'equipements',   'label' => 'Équipements'],
                ['value' => 'sous_traitance','label' => 'Sous-traitance'],
            ],
        ];

        $sort = 0;
        foreach ($data as $category => $values) {
            $sort = 0;
            foreach ($values as $entry) {
                ReferenceValue::query()->updateOrCreate(
                    ['category' => $category, 'value' => $entry['value']],
                    ['label' => $entry['label'], 'sort_order' => ++$sort]
                );
            }
        }
    }
}
```

- [ ] **Step 6: Update DatabaseSeeder**

Modify `backend/database/seeders/DatabaseSeeder.php`:

```php
<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            RoleSeeder::class,
            UnitSeeder::class,
            ReferenceValueSeeder::class,
        ]);
    }
}
```

- [ ] **Step 7: Update Pest.php to seed reference values in tests**

Modify `backend/tests/Pest.php`:

```php
<?php

uses(Tests\TestCase::class, Illuminate\Foundation\Testing\RefreshDatabase::class)
    ->beforeEach(function () {
        \Illuminate\Support\Facades\Artisan::call('db:seed', ['--class' => 'RoleSeeder']);
        \Illuminate\Support\Facades\Artisan::call('db:seed', ['--class' => 'UnitSeeder']);
        \Illuminate\Support\Facades\Artisan::call('db:seed', ['--class' => 'ReferenceValueSeeder']);
    })
    ->in('Feature');
```

- [ ] **Step 8: Create the controller**

Create `backend/app/Http/Controllers/ReferenceValueController.php`:

```php
<?php

namespace App\Http\Controllers;

use App\Models\ReferenceValue;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReferenceValueController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $values = ReferenceValue::query()
            ->when($request->category, fn ($q) => $q->where('category', $request->category))
            ->orderBy('category')
            ->orderBy('sort_order')
            ->get();

        return response()->json(['data' => $values]);
    }
}
```

- [ ] **Step 9: Register the route**

Modify `backend/routes/api.php` — full file:

```php
<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\CostCodeController;
use App\Http\Controllers\DqItemController;
use App\Http\Controllers\ProjectController;
use App\Http\Controllers\ReferenceValueController;
use App\Http\Controllers\UnitController;
use App\Http\Controllers\WorkLotController;
use Illuminate\Support\Facades\Route;

Route::get('/health', function () {
    return response()->json([
        'status' => 'ok',
        'app' => config('app.name'),
        'timestamp' => now()->toIso8601String(),
    ]);
});

Route::prefix('auth')->group(function () {
    Route::post('/login', [AuthController::class, 'login']);

    Route::middleware('auth')->group(function () {
        Route::get('/me', [AuthController::class, 'me']);
        Route::post('/logout', [AuthController::class, 'logout']);
    });
});

Route::middleware('auth')->group(function () {
    Route::get('/units', [UnitController::class, 'index']);
    Route::get('/reference-values', [ReferenceValueController::class, 'index']);

    Route::get('/work-lots', [WorkLotController::class, 'index']);
    Route::post('/work-lots', [WorkLotController::class, 'store']);
    Route::put('/work-lots/{workLot}', [WorkLotController::class, 'update']);

    Route::get('/cost-codes', [CostCodeController::class, 'index']);
    Route::post('/cost-codes', [CostCodeController::class, 'store']);
    Route::put('/cost-codes/{costCode}', [CostCodeController::class, 'update']);

    Route::get('/dq-items', [DqItemController::class, 'index']);
    Route::post('/dq-items', [DqItemController::class, 'store']);
    Route::put('/dq-items/{dqItem}', [DqItemController::class, 'update']);

    Route::get('/projects', [ProjectController::class, 'index']);
    Route::post('/projects', [ProjectController::class, 'store']);
    Route::put('/projects/{project}', [ProjectController::class, 'update']);
});
```

- [ ] **Step 10: Run migration and verify tests pass**

```bash
cd backend && php artisan migrate
cd backend && php artisan test tests/Feature/ReferenceValues/ReferenceValueIndexTest.php
```

Expected:

```text
PASS  Tests\Feature\ReferenceValues\ReferenceValueIndexTest
✓ lists reference values filtered by category
✓ lists all reference values when no category filter is applied
```

- [ ] **Step 11: Verify all tests pass**

```bash
cd backend && php artisan test --testsuite=Feature
```

Expected:

```text
Tests: 23 passed
```

- [ ] **Step 12: Commit**

```bash
git add backend/app/Models/ReferenceValue.php \
        backend/database/migrations/2026_04_30_200005_create_reference_values_table.php \
        backend/database/seeders/ReferenceValueSeeder.php \
        backend/database/seeders/DatabaseSeeder.php \
        backend/app/Http/Controllers/ReferenceValueController.php \
        backend/routes/api.php \
        backend/tests/Pest.php \
        backend/tests/Feature/ReferenceValues/
git commit -m "feat: add reference values table, seeder, and read api"
```

---

## Task 6: Frontend Settings Shell

**Files:**
- Modify: `frontend/src/main.tsx`
- Modify: `frontend/src/router.tsx`
- Create: `frontend/src/features/settings/pages/SettingsPage.tsx`
- Create: `frontend/src/features/settings/types.ts`
- Modify: `frontend/src/styles/index.css`

- [ ] **Step 1: Write the failing settings page test**

Create `frontend/src/features/settings/pages/SettingsPage.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import SettingsPage from './SettingsPage';

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

const wrap = (ui: React.ReactElement) =>
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );

describe('SettingsPage', () => {
  it('renders the three settings tabs', () => {
    wrap(<SettingsPage />);

    expect(screen.getByRole('button', { name: 'Lots de travaux' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Codes coûts' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Articles' })).toBeInTheDocument();
  });

  it('shows the work lots tab by default', () => {
    wrap(<SettingsPage />);

    expect(screen.getByRole('button', { name: 'Lots de travaux' })).toHaveClass('active');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd frontend && npm run test -- SettingsPage.test.tsx
```

Expected:

```text
FAIL
Cannot find module './SettingsPage'
```

- [ ] **Step 3: Set up QueryClientProvider in main.tsx**

Modify `frontend/src/main.tsx`:

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import './styles/index.css';
import App from './App.tsx';
import { queryClient } from './lib/query-client';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
);
```

- [ ] **Step 4: Create the shared settings types**

Create `frontend/src/features/settings/types.ts`:

```ts
export type Unit = {
  id: number;
  code: string;
  label: string;
  sort_order: number;
};

export type WorkLot = {
  id: number;
  company_id: number;
  code: string;
  label: string;
  sort_order: number;
  is_active: boolean;
};

export type CostCode = {
  id: number;
  company_id: number;
  code: string;
  label: string;
};

export type DqItem = {
  id: number;
  company_id: number;
  work_lot_id: number;
  unit_id: number;
  code: string;
  designation: string;
  unit_price: string;
  is_active: boolean;
  work_lot: WorkLot;
  unit: Unit;
};
```

- [ ] **Step 5: Add tab styles to the CSS**

Append to `frontend/src/styles/index.css`:

```css
/* ─── Tabs ─── */

.tab-nav {
  display: flex;
  gap: 4px;
  padding: 0 0 16px;
  border-bottom: 1px solid var(--border);
  margin-bottom: 20px;
}

.tab-nav button {
  padding: 7px 16px;
  font-size: 13px;
  font-weight: 500;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.tab-nav button:hover {
  background: var(--bg-app);
  color: var(--text-main);
}

.tab-nav button.active {
  background: var(--accent);
  color: #fff;
  border-color: var(--accent);
}
```

- [ ] **Step 6: Create the SettingsPage**

Create `frontend/src/features/settings/pages/SettingsPage.tsx`:

```tsx
import { useState } from 'react';
import WorkLotsPage from './WorkLotsPage';
import DqItemsPage from './DqItemsPage';

type Tab = 'work-lots' | 'cost-codes' | 'articles';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('work-lots');

  return (
    <div className="page-content">
      <div className="page-header">
        <h1>Paramètres</h1>
      </div>
      <div className="card">
        <div className="tab-nav">
          <button
            onClick={() => setActiveTab('work-lots')}
            className={activeTab === 'work-lots' ? 'active' : ''}
          >
            Lots de travaux
          </button>
          <button
            onClick={() => setActiveTab('cost-codes')}
            className={activeTab === 'cost-codes' ? 'active' : ''}
          >
            Codes coûts
          </button>
          <button
            onClick={() => setActiveTab('articles')}
            className={activeTab === 'articles' ? 'active' : ''}
          >
            Articles
          </button>
        </div>
        {activeTab === 'work-lots' && <WorkLotsPage />}
        {activeTab === 'cost-codes' && (
          <p className="empty-state">Codes coûts — disponible prochainement.</p>
        )}
        {activeTab === 'articles' && <DqItemsPage />}
      </div>
    </div>
  );
}
```

Note: `WorkLotsPage` and `DqItemsPage` will be created in Tasks 7 and 8. For now, create temporary stubs so the test can import this file.

Create `frontend/src/features/settings/pages/WorkLotsPage.tsx`:

```tsx
export default function WorkLotsPage() {
  return <div>Lots de travaux</div>;
}
```

Create `frontend/src/features/settings/pages/DqItemsPage.tsx`:

```tsx
export default function DqItemsPage() {
  return <div>Articles</div>;
}
```

- [ ] **Step 7: Register the /settings route**

Modify `frontend/src/router.tsx`:

```tsx
import { createBrowserRouter } from 'react-router-dom';
import AppShell from './components/layout/AppShell';
import ProtectedRoute from './components/guards/ProtectedRoute';
import LoginPage from './features/auth/pages/LoginPage';
import DashboardPage from './features/dashboard/pages/DashboardPage';
import ProjectsPage from './features/projects/pages/ProjectsPage';
import NewProjectPage from './features/projects/pages/NewProjectPage';
import SettingsPage from './features/settings/pages/SettingsPage';
import { authState } from './features/auth/stores/auth-store';

function isAuth() {
  return authState.isAuthenticated;
}

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: (
      <ProtectedRoute isAuthenticated={isAuth()}>
        <AppShell>
          <DashboardPage />
        </AppShell>
      </ProtectedRoute>
    ),
  },
  {
    path: '/projects',
    element: (
      <ProtectedRoute isAuthenticated={isAuth()}>
        <AppShell>
          <ProjectsPage />
        </AppShell>
      </ProtectedRoute>
    ),
  },
  {
    path: '/projects/new',
    element: (
      <ProtectedRoute isAuthenticated={isAuth()}>
        <AppShell>
          <NewProjectPage />
        </AppShell>
      </ProtectedRoute>
    ),
  },
  {
    path: '/settings',
    element: (
      <ProtectedRoute isAuthenticated={isAuth()}>
        <AppShell>
          <SettingsPage />
        </AppShell>
      </ProtectedRoute>
    ),
  },
]);
```

- [ ] **Step 8: Run the settings page test**

```bash
cd frontend && npm run test -- SettingsPage.test.tsx
```

Expected:

```text
PASS
Tests: 2 passed
```

- [ ] **Step 9: Verify all frontend tests pass**

```bash
cd frontend && npm run test
```

Expected:

```text
Test Files  4 passed (4)
Tests  9 passed (9)
```

- [ ] **Step 10: Commit**

```bash
git add frontend/src/main.tsx \
        frontend/src/router.tsx \
        frontend/src/styles/index.css \
        frontend/src/features/settings/types.ts \
        frontend/src/features/settings/pages/SettingsPage.tsx \
        frontend/src/features/settings/pages/WorkLotsPage.tsx \
        frontend/src/features/settings/pages/DqItemsPage.tsx \
        frontend/src/features/settings/pages/SettingsPage.test.tsx
git commit -m "feat: add settings page shell with tab navigation"
```

---

## Task 7: Frontend Work Lots Settings Page

**Files:**
- Create: `frontend/src/features/settings/api/work-lots.ts`
- Create: `frontend/src/features/settings/api/units.ts`
- Create: `frontend/src/features/settings/components/WorkLotList.tsx`
- Create: `frontend/src/features/settings/components/WorkLotForm.tsx`
- Modify: `frontend/src/features/settings/pages/WorkLotsPage.tsx`
- Test: `frontend/src/features/settings/components/WorkLotList.test.tsx`

- [ ] **Step 1: Write the failing WorkLotList test**

Create `frontend/src/features/settings/components/WorkLotList.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import WorkLotList from './WorkLotList';
import type { WorkLot } from '../types';

const mockLots: WorkLot[] = [
  { id: 1, company_id: 1, code: 'GO', label: 'Gros Oeuvre', sort_order: 1, is_active: true },
  { id: 2, company_id: 1, code: 'ELEC', label: 'Électricité', sort_order: 2, is_active: true },
];

describe('WorkLotList', () => {
  it('renders a row for each work lot', () => {
    render(<WorkLotList workLots={mockLots} />);

    expect(screen.getByText('Gros Oeuvre')).toBeInTheDocument();
    expect(screen.getByText('GO')).toBeInTheDocument();
    expect(screen.getByText('Électricité')).toBeInTheDocument();
    expect(screen.getByText('ELEC')).toBeInTheDocument();
  });

  it('shows empty state when no work lots', () => {
    render(<WorkLotList workLots={[]} />);
    expect(screen.getByText(/Aucun lot/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd frontend && npm run test -- WorkLotList.test.tsx
```

Expected:

```text
FAIL
Cannot find module './WorkLotList'
```

- [ ] **Step 3: Create the API helpers**

Create `frontend/src/features/settings/api/units.ts`:

```ts
import { api } from '../../../lib/api';
import type { Unit } from '../types';

export async function listUnits(): Promise<Unit[]> {
  const response = await api.get('/units');
  return response.data.data;
}
```

Create `frontend/src/features/settings/api/work-lots.ts`:

```ts
import { api } from '../../../lib/api';
import type { WorkLot } from '../types';

export type CreateWorkLotPayload = {
  code: string;
  label: string;
  sort_order?: number;
};

export async function listWorkLots(): Promise<WorkLot[]> {
  const response = await api.get('/work-lots');
  return response.data.data;
}

export async function createWorkLot(payload: CreateWorkLotPayload): Promise<WorkLot> {
  const response = await api.post('/work-lots', payload);
  return response.data.data;
}

export async function updateWorkLot(id: number, payload: CreateWorkLotPayload): Promise<WorkLot> {
  const response = await api.put(`/work-lots/${id}`, payload);
  return response.data.data;
}
```

- [ ] **Step 4: Create the WorkLotList component**

Create `frontend/src/features/settings/components/WorkLotList.tsx`:

```tsx
import type { WorkLot } from '../types';

type WorkLotListProps = {
  workLots: WorkLot[];
};

export default function WorkLotList({ workLots }: WorkLotListProps) {
  if (workLots.length === 0) {
    return <p className="empty-state">Aucun lot de travaux. Ajoutez-en un ci-dessous.</p>;
  }

  return (
    <table className="data-table">
      <thead>
        <tr>
          <th>Code</th>
          <th>Libellé</th>
          <th>Ordre</th>
        </tr>
      </thead>
      <tbody>
        {workLots.map((lot) => (
          <tr key={lot.id}>
            <td>
              <code>{lot.code}</code>
            </td>
            <td>{lot.label}</td>
            <td>{lot.sort_order}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

- [ ] **Step 5: Create the WorkLotForm component**

Create `frontend/src/features/settings/components/WorkLotForm.tsx`:

```tsx
import { useState } from 'react';
import type { CreateWorkLotPayload } from '../api/work-lots';

type WorkLotFormProps = {
  onSubmit: (payload: CreateWorkLotPayload) => void;
  isLoading?: boolean;
};

export default function WorkLotForm({ onSubmit, isLoading = false }: WorkLotFormProps) {
  const [code, setCode] = useState('');
  const [label, setLabel] = useState('');
  const [sortOrder, setSortOrder] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      code: code.toUpperCase(),
      label,
      sort_order: sortOrder ? Number(sortOrder) : undefined,
    });
    setCode('');
    setLabel('');
    setSortOrder('');
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8, marginTop: 16 }}>
      <div className="form-group" style={{ margin: 0, flex: '0 0 100px' }}>
        <input
          placeholder="Code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          required
        />
      </div>
      <div className="form-group" style={{ margin: 0, flex: 1 }}>
        <input
          placeholder="Libellé"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          required
        />
      </div>
      <div className="form-group" style={{ margin: 0, flex: '0 0 80px' }}>
        <input
          placeholder="Ordre"
          type="number"
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
        />
      </div>
      <button type="submit" className="btn-primary" disabled={isLoading}>
        Ajouter
      </button>
    </form>
  );
}
```

- [ ] **Step 6: Replace the WorkLotsPage stub with the real implementation**

Modify `frontend/src/features/settings/pages/WorkLotsPage.tsx`:

```tsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import WorkLotList from '../components/WorkLotList';
import WorkLotForm from '../components/WorkLotForm';
import { listWorkLots, createWorkLot, type CreateWorkLotPayload } from '../api/work-lots';

export default function WorkLotsPage() {
  const qc = useQueryClient();

  const { data: workLots = [] } = useQuery({
    queryKey: ['work-lots'],
    queryFn: listWorkLots,
  });

  const { mutate: addWorkLot, isPending } = useMutation({
    mutationFn: (payload: CreateWorkLotPayload) => createWorkLot(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['work-lots'] }),
  });

  return (
    <div>
      <WorkLotList workLots={workLots} />
      <WorkLotForm onSubmit={addWorkLot} isLoading={isPending} />
    </div>
  );
}
```

- [ ] **Step 7: Run the WorkLotList test**

```bash
cd frontend && npm run test -- WorkLotList.test.tsx
```

Expected:

```text
PASS
Tests: 2 passed
```

- [ ] **Step 8: Verify all frontend tests still pass**

```bash
cd frontend && npm run test
```

Expected:

```text
Test Files  5 passed (5)
Tests  11 passed (11)
```

- [ ] **Step 9: Commit**

```bash
git add frontend/src/features/settings/api/units.ts \
        frontend/src/features/settings/api/work-lots.ts \
        frontend/src/features/settings/components/WorkLotList.tsx \
        frontend/src/features/settings/components/WorkLotForm.tsx \
        frontend/src/features/settings/pages/WorkLotsPage.tsx \
        frontend/src/features/settings/components/WorkLotList.test.tsx
git commit -m "feat: add work lots settings page with list and create form"
```

---

## Task 8: Frontend DQ Items Library Page

**Files:**
- Create: `frontend/src/features/settings/api/dq-items.ts`
- Create: `frontend/src/features/settings/api/cost-codes.ts`
- Create: `frontend/src/features/settings/components/DqItemTable.tsx`
- Create: `frontend/src/features/settings/components/DqItemForm.tsx`
- Modify: `frontend/src/features/settings/pages/DqItemsPage.tsx`
- Test: `frontend/src/features/settings/components/DqItemTable.test.tsx`

- [ ] **Step 1: Write the failing DqItemTable test**

Create `frontend/src/features/settings/components/DqItemTable.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import DqItemTable from './DqItemTable';
import type { DqItem } from '../types';

const mockItems: DqItem[] = [
  {
    id: 1,
    company_id: 1,
    work_lot_id: 1,
    unit_id: 1,
    code: 'GO-001',
    designation: 'Béton dosé 300 kg/m³',
    unit_price: '85000.00',
    is_active: true,
    work_lot: { id: 1, company_id: 1, code: 'GO', label: 'Gros Oeuvre', sort_order: 1, is_active: true },
    unit: { id: 1, code: 'm³', label: 'Mètre cube', sort_order: 4 },
  },
];

describe('DqItemTable', () => {
  it('renders a row for each dq item', () => {
    render(<DqItemTable items={mockItems} />);

    expect(screen.getByText('GO-001')).toBeInTheDocument();
    expect(screen.getByText('Béton dosé 300 kg/m³')).toBeInTheDocument();
    expect(screen.getByText('m³')).toBeInTheDocument();
    expect(screen.getByText('Gros Oeuvre')).toBeInTheDocument();
  });

  it('shows empty state when no items', () => {
    render(<DqItemTable items={[]} />);
    expect(screen.getByText(/Aucun article/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd frontend && npm run test -- DqItemTable.test.tsx
```

Expected:

```text
FAIL
Cannot find module './DqItemTable'
```

- [ ] **Step 3: Create the API helpers**

Create `frontend/src/features/settings/api/dq-items.ts`:

```ts
import { api } from '../../../lib/api';
import type { DqItem } from '../types';

export type CreateDqItemPayload = {
  work_lot_id: number;
  unit_id: number;
  code: string;
  designation: string;
  unit_price: number;
};

export async function listDqItems(workLotId?: number): Promise<DqItem[]> {
  const params = workLotId ? { work_lot_id: workLotId } : {};
  const response = await api.get('/dq-items', { params });
  return response.data.data;
}

export async function createDqItem(payload: CreateDqItemPayload): Promise<DqItem> {
  const response = await api.post('/dq-items', payload);
  return response.data.data;
}

export async function updateDqItem(id: number, payload: CreateDqItemPayload): Promise<DqItem> {
  const response = await api.put(`/dq-items/${id}`, payload);
  return response.data.data;
}
```

Create `frontend/src/features/settings/api/cost-codes.ts`:

```ts
import { api } from '../../../lib/api';
import type { CostCode } from '../types';

export type CreateCostCodePayload = {
  code: string;
  label: string;
};

export async function listCostCodes(): Promise<CostCode[]> {
  const response = await api.get('/cost-codes');
  return response.data.data;
}

export async function createCostCode(payload: CreateCostCodePayload): Promise<CostCode> {
  const response = await api.post('/cost-codes', payload);
  return response.data.data;
}
```

- [ ] **Step 4: Create the DqItemTable component**

Create `frontend/src/features/settings/components/DqItemTable.tsx`:

```tsx
import type { DqItem } from '../types';

type DqItemTableProps = {
  items: DqItem[];
};

export default function DqItemTable({ items }: DqItemTableProps) {
  if (items.length === 0) {
    return <p className="empty-state">Aucun article dans la bibliothèque. Ajoutez-en un ci-dessous.</p>;
  }

  return (
    <table className="data-table">
      <thead>
        <tr>
          <th>Code</th>
          <th>Désignation</th>
          <th>Lot</th>
          <th>Unité</th>
          <th>Prix unitaire</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <tr key={item.id}>
            <td>
              <code>{item.code}</code>
            </td>
            <td>{item.designation}</td>
            <td>{item.work_lot.label}</td>
            <td>{item.unit.code}</td>
            <td>{Number(item.unit_price).toLocaleString('fr-FR')} FCFA</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

- [ ] **Step 5: Create the DqItemForm component**

Create `frontend/src/features/settings/components/DqItemForm.tsx`:

```tsx
import { useState } from 'react';
import type { WorkLot, Unit } from '../types';
import type { CreateDqItemPayload } from '../api/dq-items';

type DqItemFormProps = {
  workLots: WorkLot[];
  units: Unit[];
  onSubmit: (payload: CreateDqItemPayload) => void;
  isLoading?: boolean;
};

export default function DqItemForm({ workLots, units, onSubmit, isLoading = false }: DqItemFormProps) {
  const [workLotId, setWorkLotId] = useState('');
  const [unitId, setUnitId] = useState('');
  const [code, setCode] = useState('');
  const [designation, setDesignation] = useState('');
  const [unitPrice, setUnitPrice] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      work_lot_id: Number(workLotId),
      unit_id: Number(unitId),
      code: code.toUpperCase(),
      designation,
      unit_price: Number(unitPrice),
    });
    setCode('');
    setDesignation('');
    setUnitPrice('');
  }

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: 16 }}>
      <div className="form-row">
        <div className="form-group">
          <label>Lot de travaux</label>
          <select value={workLotId} onChange={(e) => setWorkLotId(e.target.value)} required>
            <option value="">-- Choisir --</option>
            {workLots.map((l) => (
              <option key={l.id} value={l.id}>
                {l.code} – {l.label}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>Code article</label>
          <input
            placeholder="GO-001"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label>Unité</label>
          <select value={unitId} onChange={(e) => setUnitId(e.target.value)} required>
            <option value="">-- Choisir --</option>
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.code}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>Prix unitaire (FCFA)</label>
          <input
            placeholder="85000"
            type="number"
            min="0"
            step="0.01"
            value={unitPrice}
            onChange={(e) => setUnitPrice(e.target.value)}
            required
          />
        </div>
      </div>
      <div className="form-group">
        <label>Désignation</label>
        <input
          placeholder="Béton dosé 300 kg/m³"
          value={designation}
          onChange={(e) => setDesignation(e.target.value)}
          required
        />
      </div>
      <button type="submit" className="btn-primary" disabled={isLoading}>
        Ajouter l'article
      </button>
    </form>
  );
}
```

- [ ] **Step 6: Replace the DqItemsPage stub with the real implementation**

Modify `frontend/src/features/settings/pages/DqItemsPage.tsx`:

```tsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import DqItemTable from '../components/DqItemTable';
import DqItemForm from '../components/DqItemForm';
import { listDqItems, createDqItem, type CreateDqItemPayload } from '../api/dq-items';
import { listWorkLots } from '../api/work-lots';
import { listUnits } from '../api/units';

export default function DqItemsPage() {
  const qc = useQueryClient();

  const { data: items = [] } = useQuery({
    queryKey: ['dq-items'],
    queryFn: () => listDqItems(),
  });

  const { data: workLots = [] } = useQuery({
    queryKey: ['work-lots'],
    queryFn: listWorkLots,
  });

  const { data: units = [] } = useQuery({
    queryKey: ['units'],
    queryFn: listUnits,
  });

  const { mutate: addItem, isPending } = useMutation({
    mutationFn: (payload: CreateDqItemPayload) => createDqItem(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dq-items'] }),
  });

  return (
    <div>
      <DqItemTable items={items} />
      <DqItemForm workLots={workLots} units={units} onSubmit={addItem} isLoading={isPending} />
    </div>
  );
}
```

- [ ] **Step 7: Run the DqItemTable test**

```bash
cd frontend && npm run test -- DqItemTable.test.tsx
```

Expected:

```text
PASS
Tests: 2 passed
```

- [ ] **Step 8: Verify all frontend tests pass**

```bash
cd frontend && npm run test
```

Expected:

```text
Test Files  6 passed (6)
Tests  13 passed (13)
```

- [ ] **Step 9: Commit**

```bash
git add frontend/src/features/settings/api/dq-items.ts \
        frontend/src/features/settings/api/cost-codes.ts \
        frontend/src/features/settings/components/DqItemTable.tsx \
        frontend/src/features/settings/components/DqItemForm.tsx \
        frontend/src/features/settings/pages/DqItemsPage.tsx \
        frontend/src/features/settings/components/DqItemTable.test.tsx
git commit -m "feat: add dq items library page with table and create form"
```

---

## Task 9: Final Verification

**Files:**
- No new files

- [ ] **Step 1: Run all backend feature tests**

```bash
cd backend && php artisan migrate:fresh --seed
cd backend && php artisan test --testsuite=Feature
```

Expected:

```text
Tests: 23 passed
```

- [ ] **Step 2: Run all frontend tests**

```bash
cd frontend && npm run test
```

Expected:

```text
Test Files  6 passed (6)
Tests  13 passed (13)
```

- [ ] **Step 3: Verify the frontend production build**

```bash
cd frontend && npm run build
```

Expected:

```text
✓ built in
```

- [ ] **Step 4: Commit if there are any cleanup changes, then finish**

If the build or tests require any minor fixes, fix them and commit. Otherwise, proceed to merge.

---

## Follow-Up Plans

Once this module is implemented and verified, create and execute the next plan:

1. Company Reference Data ← this plan
2. **Projects & Technical Base** ← next
3. DQE Engine v1
4. Execution & Daily Logs
5. Costs & Payments
6. QSE
7. Reporting & Exports
