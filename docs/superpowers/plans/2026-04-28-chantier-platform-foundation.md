# Chantier Platform Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bootstrap the Laravel + React multi-chantier platform foundation with authentication, role-based access, the `Simple`-style app shell, and the core project/company data model needed for later DQE and execution modules.

**Architecture:** Build a Laravel API backend and React frontend as separate applications inside one repository. Start with a thin vertical slice: auth, organization context, role permissions, dashboard shell, and basic chantier CRUD. This foundation must be stable, testable, and ready to receive later modules without rework.

**Tech Stack:** Laravel 12, PHP 8.3+, PostgreSQL, React 18+, TypeScript, Vite, React Router, TanStack Query, Axios, Tailwind CSS, Pest, PHPUnit, Vitest, React Testing Library

---

## Scope Decomposition

The validated product spec is too broad for a single executable plan. Implementation should be split into separate plans:

1. `Platform Foundation`
2. `Company Reference Data`
3. `Projects & Technical Base`
4. `DQE Engine v1`
5. `Execution & Daily Logs`
6. `Costs & Payments`
7. `QSE`
8. `Reporting & Exports`

This document covers only `Platform Foundation`.

## Target Repository Structure

This repository is currently empty. Create a clean monorepo-style layout:

- `backend/`
  - Laravel API application
- `frontend/`
  - React application
- `docs/superpowers/specs/`
  - validated product design
- `docs/superpowers/plans/`
  - implementation plans

## File Structure

### Backend Files

- Create: `backend/composer.json`
- Create: `backend/.env.example`
- Create: `backend/routes/api.php`
- Create: `backend/app/Models/User.php`
- Create: `backend/app/Models/Company.php`
- Create: `backend/app/Models/Role.php`
- Create: `backend/app/Models/Project.php`
- Create: `backend/app/Models/ProjectMember.php`
- Create: `backend/app/Http/Controllers/AuthController.php`
- Create: `backend/app/Http/Controllers/CompanyController.php`
- Create: `backend/app/Http/Controllers/ProjectController.php`
- Create: `backend/app/Http/Middleware/EnsureCompanyContext.php`
- Create: `backend/app/Http/Requests/LoginRequest.php`
- Create: `backend/app/Http/Requests/StoreProjectRequest.php`
- Create: `backend/app/Http/Requests/UpdateProjectRequest.php`
- Create: `backend/app/Policies/ProjectPolicy.php`
- Create: `backend/database/migrations/*_create_companies_table.php`
- Create: `backend/database/migrations/*_create_roles_table.php`
- Create: `backend/database/migrations/*_update_users_table_for_companies_and_roles.php`
- Create: `backend/database/migrations/*_create_projects_table.php`
- Create: `backend/database/migrations/*_create_project_members_table.php`
- Create: `backend/database/seeders/RoleSeeder.php`
- Create: `backend/database/seeders/DatabaseSeeder.php`
- Create: `backend/tests/Feature/Auth/LoginTest.php`
- Create: `backend/tests/Feature/Projects/ProjectIndexTest.php`
- Create: `backend/tests/Feature/Projects/ProjectStoreTest.php`
- Create: `backend/tests/Feature/Projects/ProjectAuthorizationTest.php`
- Create: `backend/tests/Feature/Company/CompanyContextTest.php`

### Frontend Files

- Create: `frontend/package.json`
- Create: `frontend/index.html`
- Create: `frontend/vite.config.ts`
- Create: `frontend/tsconfig.json`
- Create: `frontend/src/main.tsx`
- Create: `frontend/src/App.tsx`
- Create: `frontend/src/router.tsx`
- Create: `frontend/src/lib/api.ts`
- Create: `frontend/src/lib/query-client.ts`
- Create: `frontend/src/features/auth/api/login.ts`
- Create: `frontend/src/features/auth/components/LoginForm.tsx`
- Create: `frontend/src/features/auth/pages/LoginPage.tsx`
- Create: `frontend/src/features/auth/stores/auth-store.ts`
- Create: `frontend/src/features/dashboard/pages/DashboardPage.tsx`
- Create: `frontend/src/features/projects/api/list-projects.ts`
- Create: `frontend/src/features/projects/api/create-project.ts`
- Create: `frontend/src/features/projects/components/ProjectTable.tsx`
- Create: `frontend/src/features/projects/components/ProjectForm.tsx`
- Create: `frontend/src/features/projects/pages/ProjectsPage.tsx`
- Create: `frontend/src/features/projects/pages/NewProjectPage.tsx`
- Create: `frontend/src/features/projects/types.ts`
- Create: `frontend/src/components/layout/AppShell.tsx`
- Create: `frontend/src/components/layout/Sidebar.tsx`
- Create: `frontend/src/components/layout/Topbar.tsx`
- Create: `frontend/src/components/guards/ProtectedRoute.tsx`
- Create: `frontend/src/components/ui/Card.tsx`
- Create: `frontend/src/components/ui/PageHeader.tsx`
- Create: `frontend/src/styles/index.css`
- Create: `frontend/src/test/test-utils.tsx`
- Create: `frontend/src/features/auth/components/LoginForm.test.tsx`
- Create: `frontend/src/features/projects/components/ProjectTable.test.tsx`

### Root Files

- Create: `README.md`
- Create: `.gitignore`

## Assumptions

- Authentication will use Laravel Sanctum with cookie-based session auth for the first version.
- One user belongs to one company in V1.
- One user has one primary role in V1.
- The frontend will mimic the `Simple` admin structure without depending on server-rendered Blade templates.
- PostgreSQL is the only supported database target in the plan.

## Task 1: Scaffold The Repository And Document Local Setup

**Files:**
- Create: `README.md`
- Create: `.gitignore`
- Create: `backend/`
- Create: `frontend/`

- [ ] **Step 1: Write the failing documentation check**

Create `README.md` with this placeholder line only:

```md
Project setup documentation pending.
```

This intentionally fails the project standard because it does not explain how to boot the system.

- [ ] **Step 2: Verify the documentation is incomplete**

Run:

```bash
sed -n '1,40p' README.md
```

Expected:

```text
Project setup documentation pending.
```

- [ ] **Step 3: Replace with a complete repository bootstrap README**

Write `README.md` with:

````md
# Chantier Platform

Monorepo for the chantier multi-project management platform.

## Apps

- `backend/`: Laravel API
- `frontend/`: React web app

## Local Requirements

- PHP 8.3+
- Composer 2+
- Node.js 20+
- npm 10+
- PostgreSQL 15+

## Backend Setup

```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate --seed
php artisan serve
```

## Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

## Testing

### Backend

```bash
cd backend
php artisan test
```

### Frontend

```bash
cd frontend
npm run test
```
````

- [ ] **Step 4: Add a repository `.gitignore`**

Create `.gitignore`:

```gitignore
.DS_Store
node_modules
vendor
.env
dist
coverage
backend/bootstrap/cache/*.php
backend/storage/*.key
backend/storage/app/*
backend/storage/framework/cache/*
backend/storage/framework/sessions/*
backend/storage/framework/views/*
backend/storage/logs/*
frontend/.vite
```

- [ ] **Step 5: Verify the repository bootstrap files are present**

Run:

```bash
ls -la
```

Expected:

```text
README.md
.gitignore
backend
frontend
docs
```

- [ ] **Step 6: Commit**

```bash
git add README.md .gitignore
git commit -m "chore: initialize repository docs and ignore rules"
```

## Task 2: Create The Laravel API Application

**Files:**
- Create: `backend/composer.json`
- Create: `backend/artisan`
- Create: `backend/routes/api.php`
- Create: `backend/config/*`
- Test: `backend/tests/Feature/Smoke/ApiHealthTest.php`

- [ ] **Step 1: Write the failing backend smoke test**

Create `backend/tests/Feature/Smoke/ApiHealthTest.php`:

```php
<?php

use Illuminate\Testing\Fluent\AssertableJson;

it('returns api health metadata', function () {
    $response = $this->getJson('/api/health');

    $response
        ->assertOk()
        ->assertJson(fn (AssertableJson $json) => $json
            ->where('status', 'ok')
            ->whereType('app', 'string')
            ->whereType('timestamp', 'string')
        );
});
```

- [ ] **Step 2: Run the backend test to verify it fails**

Run:

```bash
cd backend && php artisan test tests/Feature/Smoke/ApiHealthTest.php
```

Expected:

```text
FAIL
Could not open input file: artisan
```

- [ ] **Step 3: Create the Laravel backend app**

Run:

```bash
composer create-project laravel/laravel backend
```

Expected:

```text
Application ready
```

- [ ] **Step 4: Add the API health route**

Modify `backend/routes/api.php`:

```php
<?php

use Illuminate\Support\Facades\Route;

Route::get('/health', function () {
    return response()->json([
        'status' => 'ok',
        'app' => config('app.name'),
        'timestamp' => now()->toIso8601String(),
    ]);
});
```

- [ ] **Step 5: Run the smoke test again**

Run:

```bash
cd backend && php artisan test tests/Feature/Smoke/ApiHealthTest.php
```

Expected:

```text
PASS
```

- [ ] **Step 6: Commit**

```bash
git add backend
git commit -m "chore: scaffold laravel api backend"
```

## Task 3: Configure PostgreSQL, Pest, And Base Test Infrastructure

**Files:**
- Modify: `backend/.env.example`
- Modify: `backend/phpunit.xml`
- Create: `backend/tests/Pest.php`
- Create: `backend/tests/TestCase.php`

- [ ] **Step 1: Write a failing database connectivity test**

Create `backend/tests/Feature/Smoke/DatabaseConnectionTest.php`:

```php
<?php

use Illuminate\Support\Facades\DB;

it('connects to the configured database', function () {
    expect(DB::select('select 1 as result')[0]->result)->toBe(1);
});
```

- [ ] **Step 2: Run the test to verify environment configuration is missing**

Run:

```bash
cd backend && php artisan test tests/Feature/Smoke/DatabaseConnectionTest.php
```

Expected:

```text
FAIL
SQLSTATE
```

- [ ] **Step 3: Update `.env.example` for PostgreSQL**

Modify `backend/.env.example`:

```dotenv
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=chantier_platform
DB_USERNAME=postgres
DB_PASSWORD=postgres
```

- [ ] **Step 4: Install Pest and configure the test bootstrap**

Run:

```bash
cd backend && composer require pestphp/pest pestphp/pest-plugin-laravel --dev
cd backend && php artisan pest:install
```

Expected:

```text
Pest installed successfully
```

- [ ] **Step 5: Re-run the database test**

Run:

```bash
cd backend && php artisan test tests/Feature/Smoke/DatabaseConnectionTest.php
```

Expected:

```text
PASS
```

- [ ] **Step 6: Commit**

```bash
git add backend/.env.example backend/composer.json backend/composer.lock backend/tests backend/phpunit.xml
git commit -m "test: configure pest and postgres test baseline"
```

## Task 4: Add Companies, Roles, And User Membership Foundations

**Files:**
- Create: `backend/app/Models/Company.php`
- Create: `backend/app/Models/Role.php`
- Modify: `backend/app/Models/User.php`
- Create: `backend/database/migrations/*_create_companies_table.php`
- Create: `backend/database/migrations/*_create_roles_table.php`
- Create: `backend/database/migrations/*_update_users_table_for_companies_and_roles.php`
- Create: `backend/database/seeders/RoleSeeder.php`
- Modify: `backend/database/seeders/DatabaseSeeder.php`
- Test: `backend/tests/Feature/Company/CompanyContextTest.php`

- [ ] **Step 1: Write the failing company membership test**

Create `backend/tests/Feature/Company/CompanyContextTest.php`:

```php
<?php

use App\Models\Company;
use App\Models\Role;
use App\Models\User;

it('assigns a user to one company and one role', function () {
    $company = Company::factory()->create();
    $role = Role::query()->create(['name' => 'direction', 'label' => 'Direction']);

    $user = User::factory()->create([
        'company_id' => $company->id,
        'role_id' => $role->id,
    ]);

    expect($user->company)->not->toBeNull()
        ->and($user->role)->not->toBeNull()
        ->and($user->company->is($company))->toBeTrue()
        ->and($user->role->is($role))->toBeTrue();
});
```

- [ ] **Step 2: Run the test to verify schema/models are missing**

Run:

```bash
cd backend && php artisan test tests/Feature/Company/CompanyContextTest.php
```

Expected:

```text
FAIL
Class "App\Models\Company" not found
```

- [ ] **Step 3: Create the company and role models**

Create `backend/app/Models/Company.php`:

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Company extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'slug',
    ];

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }
}
```

Create `backend/app/Models/Role.php`:

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Role extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'label',
    ];

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }
}
```

- [ ] **Step 4: Update the user model relationships**

Modify `backend/app/Models/User.php`:

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    use HasFactory, Notifiable;

    protected $fillable = [
        'name',
        'email',
        'password',
        'company_id',
        'role_id',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function role(): BelongsTo
    {
        return $this->belongsTo(Role::class);
    }
}
```

- [ ] **Step 5: Create the migrations**

Create the company migration:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('companies', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('companies');
    }
};
```

Create the role migration:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('roles', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->string('label');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('roles');
    }
};
```

Create the user table update migration:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('company_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('role_id')->nullable()->constrained()->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropConstrainedForeignId('company_id');
            $table->dropConstrainedForeignId('role_id');
        });
    }
};
```

- [ ] **Step 6: Seed the default roles**

Create `backend/database/seeders/RoleSeeder.php`:

```php
<?php

namespace Database\Seeders;

use App\Models\Role;
use Illuminate\Database\Seeder;

class RoleSeeder extends Seeder
{
    public function run(): void
    {
        $roles = [
            ['name' => 'direction', 'label' => 'Direction'],
            ['name' => 'directeur-technique', 'label' => 'Directeur technique'],
            ['name' => 'conducteur-travaux', 'label' => 'Conducteur de travaux'],
            ['name' => 'chef-chantier', 'label' => 'Chef de chantier'],
            ['name' => 'metreur-economiste', 'label' => 'Métreur / économiste'],
            ['name' => 'comptable', 'label' => 'Comptable'],
            ['name' => 'lecture-seule', 'label' => 'Lecture seule'],
        ];

        foreach ($roles as $role) {
            Role::query()->updateOrCreate(
                ['name' => $role['name']],
                ['label' => $role['label']]
            );
        }
    }
}
```

Modify `backend/database/seeders/DatabaseSeeder.php`:

```php
<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call(RoleSeeder::class);
    }
}
```

- [ ] **Step 7: Run migrations and tests**

Run:

```bash
cd backend && php artisan migrate:fresh --seed
cd backend && php artisan test tests/Feature/Company/CompanyContextTest.php
```

Expected:

```text
PASS
```

- [ ] **Step 8: Commit**

```bash
git add backend/app/Models backend/database backend/tests/Feature/Company
git commit -m "feat: add company and role data foundations"
```

## Task 5: Implement Session Authentication With Sanctum

**Files:**
- Modify: `backend/composer.json`
- Create: `backend/app/Http/Requests/LoginRequest.php`
- Create: `backend/app/Http/Controllers/AuthController.php`
- Modify: `backend/routes/api.php`
- Test: `backend/tests/Feature/Auth/LoginTest.php`

- [ ] **Step 1: Write the failing login test**

Create `backend/tests/Feature/Auth/LoginTest.php`:

```php
<?php

use App\Models\Company;
use App\Models\Role;
use App\Models\User;

it('logs in a valid user and returns profile data', function () {
    $company = Company::factory()->create();
    $role = Role::query()->firstOrCreate(
        ['name' => 'direction'],
        ['label' => 'Direction']
    );

    $user = User::factory()->create([
        'company_id' => $company->id,
        'role_id' => $role->id,
        'email' => 'direction@example.com',
        'password' => 'password',
    ]);

    $response = $this->postJson('/api/auth/login', [
        'email' => 'direction@example.com',
        'password' => 'password',
    ]);

    $response
        ->assertOk()
        ->assertJsonPath('user.email', $user->email)
        ->assertJsonPath('user.role.name', 'direction')
        ->assertJsonPath('user.company.id', $company->id);
});
```

- [ ] **Step 2: Run the test to verify auth is missing**

Run:

```bash
cd backend && php artisan test tests/Feature/Auth/LoginTest.php
```

Expected:

```text
FAIL
404
```

- [ ] **Step 3: Install Sanctum**

Run:

```bash
cd backend && composer require laravel/sanctum
cd backend && php artisan vendor:publish --provider="Laravel\\Sanctum\\SanctumServiceProvider"
cd backend && php artisan migrate
```

Expected:

```text
INFO  Publishing complete
```

- [ ] **Step 4: Add login request validation**

Create `backend/app/Http/Requests/LoginRequest.php`:

```php
<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class LoginRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ];
    }
}
```

- [ ] **Step 5: Add the auth controller**

Create `backend/app/Http/Controllers/AuthController.php`:

```php
<?php

namespace App\Http\Controllers;

use App\Http\Requests\LoginRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;

class AuthController extends Controller
{
    public function login(LoginRequest $request): JsonResponse
    {
        $credentials = $request->validated();

        if (! Auth::attempt($credentials)) {
            return response()->json([
                'message' => 'Invalid credentials.',
            ], 422);
        }

        $request->session()->regenerate();

        /** @var User $user */
        $user = Auth::user();
        $user->load(['company', 'role']);

        return response()->json([
            'user' => $user,
        ]);
    }

    public function logout(): JsonResponse
    {
        Auth::guard('web')->logout();
        request()->session()->invalidate();
        request()->session()->regenerateToken();

        return response()->json([
            'status' => 'ok',
        ]);
    }

    public function me(): JsonResponse
    {
        /** @var User $user */
        $user = Auth::user();

        return response()->json([
            'user' => $user?->load(['company', 'role']),
        ]);
    }
}
```

- [ ] **Step 6: Register auth routes**

Modify `backend/routes/api.php`:

```php
<?php

use App\Http\Controllers\AuthController;
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
```

- [ ] **Step 7: Run the login test**

Run:

```bash
cd backend && php artisan test tests/Feature/Auth/LoginTest.php
```

Expected:

```text
PASS
```

- [ ] **Step 8: Commit**

```bash
git add backend/app/Http backend/routes/api.php backend/composer.json backend/composer.lock backend/tests/Feature/Auth
git commit -m "feat: add session auth endpoints"
```

## Task 6: Add Project Data Model And Project CRUD API

**Files:**
- Create: `backend/app/Models/Project.php`
- Create: `backend/app/Models/ProjectMember.php`
- Create: `backend/app/Http/Requests/StoreProjectRequest.php`
- Create: `backend/app/Http/Requests/UpdateProjectRequest.php`
- Create: `backend/app/Http/Controllers/ProjectController.php`
- Create: `backend/database/migrations/*_create_projects_table.php`
- Create: `backend/database/migrations/*_create_project_members_table.php`
- Test: `backend/tests/Feature/Projects/ProjectIndexTest.php`
- Test: `backend/tests/Feature/Projects/ProjectStoreTest.php`

- [ ] **Step 1: Write the failing project listing test**

Create `backend/tests/Feature/Projects/ProjectIndexTest.php`:

```php
<?php

use App\Models\Company;
use App\Models\Role;
use App\Models\User;

it('lists only projects belonging to the authenticated user company', function () {
    $companyA = Company::factory()->create();
    $companyB = Company::factory()->create();
    $role = Role::query()->first();

    $user = User::factory()->create([
        'company_id' => $companyA->id,
        'role_id' => $role->id,
    ]);

    $projectA = \App\Models\Project::query()->create([
        'company_id' => $companyA->id,
        'code' => 'CH-001',
        'name' => 'Chantier A',
        'status' => 'active',
        'location' => 'Abidjan',
        'budget_amount' => 1000000,
    ]);

    \App\Models\Project::query()->create([
        'company_id' => $companyB->id,
        'code' => 'CH-002',
        'name' => 'Chantier B',
        'status' => 'active',
        'location' => 'Bouake',
        'budget_amount' => 2000000,
    ]);

    $response = $this->actingAs($user)->getJson('/api/projects');

    $response
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.id', $projectA->id);
});
```

- [ ] **Step 2: Run the test to verify the project model is missing**

Run:

```bash
cd backend && php artisan test tests/Feature/Projects/ProjectIndexTest.php
```

Expected:

```text
FAIL
Class "App\Models\Project" not found
```

- [ ] **Step 3: Create the project models**

Create `backend/app/Models/Project.php`:

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Project extends Model
{
    use HasFactory;

    protected $fillable = [
        'company_id',
        'code',
        'name',
        'status',
        'location',
        'budget_amount',
        'start_date',
        'end_date',
    ];

    protected function casts(): array
    {
        return [
            'budget_amount' => 'decimal:2',
            'start_date' => 'date',
            'end_date' => 'date',
        ];
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function members(): HasMany
    {
        return $this->hasMany(ProjectMember::class);
    }
}
```

Create `backend/app/Models/ProjectMember.php`:

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProjectMember extends Model
{
    use HasFactory;

    protected $fillable = [
        'project_id',
        'user_id',
        'assignment_role',
    ];

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
```

- [ ] **Step 4: Create the project migrations**

Create `backend/database/migrations/*_create_projects_table.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('projects', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->string('code');
            $table->string('name');
            $table->string('status')->default('draft');
            $table->string('location')->nullable();
            $table->decimal('budget_amount', 15, 2)->default(0);
            $table->date('start_date')->nullable();
            $table->date('end_date')->nullable();
            $table->timestamps();

            $table->unique(['company_id', 'code']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('projects');
    }
};
```

Create `backend/database/migrations/*_create_project_members_table.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('project_members', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('assignment_role')->nullable();
            $table->timestamps();

            $table->unique(['project_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('project_members');
    }
};
```

- [ ] **Step 5: Add project request validation**

Create `backend/app/Http/Requests/StoreProjectRequest.php`:

```php
<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreProjectRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'code' => ['required', 'string', 'max:255'],
            'name' => ['required', 'string', 'max:255'],
            'status' => ['required', 'string', 'max:50'],
            'location' => ['nullable', 'string', 'max:255'],
            'budget_amount' => ['nullable', 'numeric', 'min:0'],
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date'],
        ];
    }
}
```

Create `backend/app/Http/Requests/UpdateProjectRequest.php`:

```php
<?php

namespace App\Http\Requests;

class UpdateProjectRequest extends StoreProjectRequest
{
}
```

- [ ] **Step 6: Add the project controller**

Create `backend/app/Http/Controllers/ProjectController.php`:

```php
<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreProjectRequest;
use App\Http\Requests\UpdateProjectRequest;
use App\Models\Project;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProjectController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $projects = Project::query()
            ->where('company_id', $request->user()->company_id)
            ->latest()
            ->get();

        return response()->json([
            'data' => $projects,
        ]);
    }

    public function store(StoreProjectRequest $request): JsonResponse
    {
        $project = Project::query()->create([
            ...$request->validated(),
            'company_id' => $request->user()->company_id,
        ]);

        return response()->json([
            'data' => $project,
        ], 201);
    }

    public function update(UpdateProjectRequest $request, Project $project): JsonResponse
    {
        abort_unless($project->company_id === $request->user()->company_id, 404);

        $project->update($request->validated());

        return response()->json([
            'data' => $project->fresh(),
        ]);
    }
}
```

- [ ] **Step 7: Register project API routes**

Modify `backend/routes/api.php`:

```php
<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\ProjectController;
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
    Route::get('/projects', [ProjectController::class, 'index']);
    Route::post('/projects', [ProjectController::class, 'store']);
    Route::put('/projects/{project}', [ProjectController::class, 'update']);
});
```

- [ ] **Step 8: Write the failing project creation test**

Create `backend/tests/Feature/Projects/ProjectStoreTest.php`:

```php
<?php

use App\Models\Company;
use App\Models\Role;
use App\Models\User;

it('creates a project for the authenticated user company', function () {
    $company = Company::factory()->create();
    $role = Role::query()->first();
    $user = User::factory()->create([
        'company_id' => $company->id,
        'role_id' => $role->id,
    ]);

    $response = $this->actingAs($user)->postJson('/api/projects', [
        'code' => 'CH-ANGRE-2026-001',
        'name' => 'Construction villa duplex R+1 - Cocody Angre',
        'status' => 'active',
        'location' => 'Abidjan',
        'budget_amount' => 85000000,
    ]);

    $response
        ->assertCreated()
        ->assertJsonPath('data.company_id', $company->id)
        ->assertJsonPath('data.code', 'CH-ANGRE-2026-001');

    $this->assertDatabaseHas('projects', [
        'company_id' => $company->id,
        'code' => 'CH-ANGRE-2026-001',
    ]);
});
```

- [ ] **Step 9: Run the project tests**

Run:

```bash
cd backend && php artisan migrate:fresh --seed
cd backend && php artisan test tests/Feature/Projects/ProjectIndexTest.php tests/Feature/Projects/ProjectStoreTest.php
```

Expected:

```text
PASS
```

- [ ] **Step 10: Commit**

```bash
git add backend/app/Models backend/app/Http/Controllers backend/app/Http/Requests backend/database/migrations backend/tests/Feature/Projects backend/routes/api.php
git commit -m "feat: add project crud api foundation"
```

## Task 7: Add Project Authorization Policy

**Files:**
- Create: `backend/app/Policies/ProjectPolicy.php`
- Modify: `backend/app/Providers/AuthServiceProvider.php`
- Test: `backend/tests/Feature/Projects/ProjectAuthorizationTest.php`

- [ ] **Step 1: Write the failing authorization test**

Create `backend/tests/Feature/Projects/ProjectAuthorizationTest.php`:

```php
<?php

use App\Models\Company;
use App\Models\Project;
use App\Models\Role;
use App\Models\User;

it('forbids updating a project from another company', function () {
    $companyA = Company::factory()->create();
    $companyB = Company::factory()->create();
    $role = Role::query()->first();

    $user = User::factory()->create([
        'company_id' => $companyA->id,
        'role_id' => $role->id,
    ]);

    $project = Project::query()->create([
        'company_id' => $companyB->id,
        'code' => 'CH-OTHER',
        'name' => 'Other Company Project',
        'status' => 'active',
        'location' => 'Yamoussoukro',
        'budget_amount' => 1000,
    ]);

    $response = $this->actingAs($user)->putJson("/api/projects/{$project->id}", [
        'code' => 'CH-OTHER',
        'name' => 'Blocked Update',
        'status' => 'active',
    ]);

    $response->assertForbidden();
});
```

- [ ] **Step 2: Run the test to verify route-level authorization is insufficient**

Run:

```bash
cd backend && php artisan test tests/Feature/Projects/ProjectAuthorizationTest.php
```

Expected:

```text
FAIL
404 or unexpected status
```

- [ ] **Step 3: Add the project policy**

Create `backend/app/Policies/ProjectPolicy.php`:

```php
<?php

namespace App\Policies;

use App\Models\Project;
use App\Models\User;

class ProjectPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->company_id !== null;
    }

    public function view(User $user, Project $project): bool
    {
        return $user->company_id === $project->company_id;
    }

    public function create(User $user): bool
    {
        return $user->company_id !== null;
    }

    public function update(User $user, Project $project): bool
    {
        return $user->company_id === $project->company_id;
    }
}
```

- [ ] **Step 4: Register the policy**

Modify `backend/app/Providers/AuthServiceProvider.php`:

```php
<?php

namespace App\Providers;

use App\Models\Project;
use App\Policies\ProjectPolicy;
use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;

class AuthServiceProvider extends ServiceProvider
{
    protected $policies = [
        Project::class => ProjectPolicy::class,
    ];

    public function boot(): void
    {
        //
    }
}
```

- [ ] **Step 5: Apply authorization in the controller**

Modify the relevant methods in `backend/app/Http/Controllers/ProjectController.php`:

```php
public function index(Request $request): JsonResponse
{
    $this->authorize('viewAny', Project::class);

    $projects = Project::query()
        ->where('company_id', $request->user()->company_id)
        ->latest()
        ->get();

    return response()->json([
        'data' => $projects,
    ]);
}

public function store(StoreProjectRequest $request): JsonResponse
{
    $this->authorize('create', Project::class);

    $project = Project::query()->create([
        ...$request->validated(),
        'company_id' => $request->user()->company_id,
    ]);

    return response()->json([
        'data' => $project,
    ], 201);
}

public function update(UpdateProjectRequest $request, Project $project): JsonResponse
{
    $this->authorize('update', $project);

    $project->update($request->validated());

    return response()->json([
        'data' => $project->fresh(),
    ]);
}
```

- [ ] **Step 6: Run the authorization test**

Run:

```bash
cd backend && php artisan test tests/Feature/Projects/ProjectAuthorizationTest.php
```

Expected:

```text
PASS
```

- [ ] **Step 7: Commit**

```bash
git add backend/app/Policies backend/app/Providers/AuthServiceProvider.php backend/tests/Feature/Projects/ProjectAuthorizationTest.php backend/app/Http/Controllers/ProjectController.php
git commit -m "feat: enforce project company authorization"
```

## Task 8: Create The React Frontend Application

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/vite.config.ts`
- Create: `frontend/src/main.tsx`
- Create: `frontend/src/App.tsx`
- Create: `frontend/src/styles/index.css`
- Test: `frontend/src/App.test.tsx`

- [ ] **Step 1: Write the failing frontend smoke test**

Create `frontend/src/App.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import App from './App';

describe('App', () => {
  it('renders the application shell heading', () => {
    render(<App />);

    expect(screen.getByText('Chantier Platform')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the frontend test to verify the app is missing**

Run:

```bash
cd frontend && npm run test
```

Expected:

```text
npm ERR! Missing script: "test"
```

- [ ] **Step 3: Scaffold the React app with Vite**

Run:

```bash
npm create vite@latest frontend -- --template react-ts
```

Expected:

```text
Done
```

- [ ] **Step 4: Install frontend baseline dependencies**

Run:

```bash
cd frontend && npm install axios @tanstack/react-query react-router-dom
cd frontend && npm install -D vitest jsdom @testing-library/react @testing-library/jest-dom
```

Expected:

```text
added packages
```

- [ ] **Step 5: Replace the default app with the platform heading**

Create `frontend/src/App.tsx`:

```tsx
export default function App() {
  return <h1>Chantier Platform</h1>;
}
```

- [ ] **Step 6: Configure the Vitest environment**

Update `frontend/package.json` scripts:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

Create `frontend/src/test/setup.ts`:

```ts
import '@testing-library/jest-dom';
```

Modify `frontend/vite.config.ts`:

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
});
```

- [ ] **Step 7: Run the frontend smoke test**

Run:

```bash
cd frontend && npm run test
```

Expected:

```text
PASS
```

- [ ] **Step 8: Commit**

```bash
git add frontend
git commit -m "chore: scaffold react frontend"
```

## Task 9: Build The App Shell And Protected Routing

**Files:**
- Create: `frontend/src/router.tsx`
- Create: `frontend/src/components/layout/AppShell.tsx`
- Create: `frontend/src/components/layout/Sidebar.tsx`
- Create: `frontend/src/components/layout/Topbar.tsx`
- Create: `frontend/src/components/guards/ProtectedRoute.tsx`
- Create: `frontend/src/features/dashboard/pages/DashboardPage.tsx`
- Modify: `frontend/src/App.tsx`
- Test: `frontend/src/components/guards/ProtectedRoute.test.tsx`

- [ ] **Step 1: Write the failing protected route test**

Create `frontend/src/components/guards/ProtectedRoute.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';

describe('ProtectedRoute', () => {
  it('redirects unauthenticated users to login', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route path="/login" element={<div>Login page</div>} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute isAuthenticated={false}>
                <div>Dashboard</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Login page')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify the guard is missing**

Run:

```bash
cd frontend && npm run test -- ProtectedRoute.test.tsx
```

Expected:

```text
FAIL
Cannot find module
```

- [ ] **Step 3: Implement the protected route**

Create `frontend/src/components/guards/ProtectedRoute.tsx`:

```tsx
import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';

type ProtectedRouteProps = {
  isAuthenticated: boolean;
  children: ReactNode;
};

export default function ProtectedRoute({
  isAuthenticated,
  children,
}: ProtectedRouteProps) {
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
```

- [ ] **Step 4: Build the app shell layout**

Create `frontend/src/components/layout/Sidebar.tsx`:

```tsx
const navItems = [
  'Dashboard',
  'Chantiers',
  'DQE',
  'Execution',
  'Couts',
  'QSE',
  'Reporting',
  'Parametres',
];

export default function Sidebar() {
  return (
    <aside>
      <h2>Chantier Platform</h2>
      <nav>
        <ul>
          {navItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
```

Create `frontend/src/components/layout/Topbar.tsx`:

```tsx
export default function Topbar() {
  return (
    <header>
      <input aria-label="Global search" placeholder="Search chantiers" />
      <button type="button">Notifications</button>
    </header>
  );
}
```

Create `frontend/src/components/layout/AppShell.tsx`:

```tsx
import type { ReactNode } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

type AppShellProps = {
  children: ReactNode;
};

export default function AppShell({ children }: AppShellProps) {
  return (
    <div>
      <Sidebar />
      <div>
        <Topbar />
        <main>{children}</main>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Add the dashboard page and router**

Create `frontend/src/features/dashboard/pages/DashboardPage.tsx`:

```tsx
export default function DashboardPage() {
  return (
    <section>
      <h1>Dashboard</h1>
      <p>Portfolio overview will appear here.</p>
    </section>
  );
}
```

Create `frontend/src/router.tsx`:

```tsx
import { createBrowserRouter } from 'react-router-dom';
import AppShell from './components/layout/AppShell';
import ProtectedRoute from './components/guards/ProtectedRoute';
import DashboardPage from './features/dashboard/pages/DashboardPage';

const isAuthenticated = true;

export const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <ProtectedRoute isAuthenticated={isAuthenticated}>
        <AppShell>
          <DashboardPage />
        </AppShell>
      </ProtectedRoute>
    ),
  },
]);
```

Modify `frontend/src/App.tsx`:

```tsx
import { RouterProvider } from 'react-router-dom';
import { router } from './router';

export default function App() {
  return <RouterProvider router={router} />;
}
```

- [ ] **Step 6: Run the protected route test**

Run:

```bash
cd frontend && npm run test -- ProtectedRoute.test.tsx
```

Expected:

```text
PASS
```

- [ ] **Step 7: Commit**

```bash
git add frontend/src
git commit -m "feat: add protected routing and app shell"
```

## Task 10: Add Login UI And Frontend Auth State

**Files:**
- Create: `frontend/src/lib/api.ts`
- Create: `frontend/src/features/auth/api/login.ts`
- Create: `frontend/src/features/auth/stores/auth-store.ts`
- Create: `frontend/src/features/auth/components/LoginForm.tsx`
- Create: `frontend/src/features/auth/pages/LoginPage.tsx`
- Test: `frontend/src/features/auth/components/LoginForm.test.tsx`

- [ ] **Step 1: Write the failing login form test**

Create `frontend/src/features/auth/components/LoginForm.test.tsx`:

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import LoginForm from './LoginForm';

describe('LoginForm', () => {
  it('collects email and password before submit', () => {
    const handleSubmit = vi.fn();

    render(<LoginForm onSubmit={handleSubmit} isLoading={false} />);

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'direction@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'password' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(handleSubmit).toHaveBeenCalledWith({
      email: 'direction@example.com',
      password: 'password',
    });
  });
});
```

- [ ] **Step 2: Run the test to verify the login form is missing**

Run:

```bash
cd frontend && npm run test -- LoginForm.test.tsx
```

Expected:

```text
FAIL
Cannot find module
```

- [ ] **Step 3: Add the API client**

Create `frontend/src/lib/api.ts`:

```ts
import axios from 'axios';

export const api = axios.create({
  baseURL: 'http://127.0.0.1:8000/api',
  withCredentials: true,
});
```

Create `frontend/src/features/auth/api/login.ts`:

```ts
import { api } from '../../../lib/api';

export type LoginPayload = {
  email: string;
  password: string;
};

export async function login(payload: LoginPayload) {
  const response = await api.post('/auth/login', payload);
  return response.data;
}
```

- [ ] **Step 4: Add a minimal auth store**

Create `frontend/src/features/auth/stores/auth-store.ts`:

```ts
export type AuthUser = {
  id: number;
  name: string;
  email: string;
  role: {
    name: string;
    label: string;
  };
  company: {
    id: number;
    name: string;
  };
} | null;

type AuthState = {
  user: AuthUser;
};

export const authState: AuthState = {
  user: null,
};

export function setAuthUser(user: AuthUser) {
  authState.user = user;
}
```

- [ ] **Step 5: Add the login form and page**

Create `frontend/src/features/auth/components/LoginForm.tsx`:

```tsx
import { useState } from 'react';
import type { LoginPayload } from '../api/login';

type LoginFormProps = {
  onSubmit: (payload: LoginPayload) => void;
  isLoading: boolean;
};

export default function LoginForm({ onSubmit, isLoading }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit({ email, password });
      }}
    >
      <label>
        Email
        <input value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>

      <label>
        Password
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>

      <button type="submit" disabled={isLoading}>
        Sign in
      </button>
    </form>
  );
}
```

Create `frontend/src/features/auth/pages/LoginPage.tsx`:

```tsx
import { useState } from 'react';
import LoginForm from '../components/LoginForm';
import { login, type LoginPayload } from '../api/login';
import { setAuthUser } from '../stores/auth-store';

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(payload: LoginPayload) {
    setIsLoading(true);

    try {
      const data = await login(payload);
      setAuthUser(data.user);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section>
      <h1>Sign in</h1>
      <LoginForm onSubmit={handleSubmit} isLoading={isLoading} />
    </section>
  );
}
```

- [ ] **Step 6: Run the login form test**

Run:

```bash
cd frontend && npm run test -- LoginForm.test.tsx
```

Expected:

```text
PASS
```

- [ ] **Step 7: Commit**

```bash
git add frontend/src/lib frontend/src/features/auth
git commit -m "feat: add frontend auth flow baseline"
```

## Task 11: Add Project Listing And Create Project UI

**Files:**
- Create: `frontend/src/features/projects/types.ts`
- Create: `frontend/src/features/projects/api/list-projects.ts`
- Create: `frontend/src/features/projects/api/create-project.ts`
- Create: `frontend/src/features/projects/components/ProjectTable.tsx`
- Create: `frontend/src/features/projects/components/ProjectForm.tsx`
- Create: `frontend/src/features/projects/pages/ProjectsPage.tsx`
- Create: `frontend/src/features/projects/pages/NewProjectPage.tsx`
- Test: `frontend/src/features/projects/components/ProjectTable.test.tsx`

- [ ] **Step 1: Write the failing project table test**

Create `frontend/src/features/projects/components/ProjectTable.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import ProjectTable from './ProjectTable';

describe('ProjectTable', () => {
  it('renders project rows', () => {
    render(
      <ProjectTable
        projects={[
          {
            id: 1,
            code: 'CH-001',
            name: 'Villa Angre',
            status: 'active',
            location: 'Abidjan',
            budget_amount: '85000000.00',
          },
        ]}
      />
    );

    expect(screen.getByText('Villa Angre')).toBeInTheDocument();
    expect(screen.getByText('CH-001')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify the project UI is missing**

Run:

```bash
cd frontend && npm run test -- ProjectTable.test.tsx
```

Expected:

```text
FAIL
Cannot find module
```

- [ ] **Step 3: Add project types and API helpers**

Create `frontend/src/features/projects/types.ts`:

```ts
export type Project = {
  id: number;
  code: string;
  name: string;
  status: string;
  location: string | null;
  budget_amount: string;
};
```

Create `frontend/src/features/projects/api/list-projects.ts`:

```ts
import { api } from '../../../lib/api';
import type { Project } from '../types';

export async function listProjects(): Promise<Project[]> {
  const response = await api.get('/projects');
  return response.data.data;
}
```

Create `frontend/src/features/projects/api/create-project.ts`:

```ts
import { api } from '../../../lib/api';

export type CreateProjectPayload = {
  code: string;
  name: string;
  status: string;
  location?: string;
  budget_amount?: number;
};

export async function createProject(payload: CreateProjectPayload) {
  const response = await api.post('/projects', payload);
  return response.data.data;
}
```

- [ ] **Step 4: Add the project table and form**

Create `frontend/src/features/projects/components/ProjectTable.tsx`:

```tsx
import type { Project } from '../types';

type ProjectTableProps = {
  projects: Project[];
};

export default function ProjectTable({ projects }: ProjectTableProps) {
  return (
    <table>
      <thead>
        <tr>
          <th>Code</th>
          <th>Name</th>
          <th>Status</th>
          <th>Location</th>
          <th>Budget</th>
        </tr>
      </thead>
      <tbody>
        {projects.map((project) => (
          <tr key={project.id}>
            <td>{project.code}</td>
            <td>{project.name}</td>
            <td>{project.status}</td>
            <td>{project.location ?? '-'}</td>
            <td>{project.budget_amount}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

Create `frontend/src/features/projects/components/ProjectForm.tsx`:

```tsx
import { useState } from 'react';
import type { CreateProjectPayload } from '../api/create-project';

type ProjectFormProps = {
  onSubmit: (payload: CreateProjectPayload) => void;
};

export default function ProjectForm({ onSubmit }: ProjectFormProps) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [status, setStatus] = useState('draft');
  const [location, setLocation] = useState('');
  const [budgetAmount, setBudgetAmount] = useState('');

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();

        onSubmit({
          code,
          name,
          status,
          location,
          budget_amount: budgetAmount ? Number(budgetAmount) : undefined,
        });
      }}
    >
      <input placeholder="Code chantier" value={code} onChange={(e) => setCode(e.target.value)} />
      <input placeholder="Nom chantier" value={name} onChange={(e) => setName(e.target.value)} />
      <input placeholder="Localisation" value={location} onChange={(e) => setLocation(e.target.value)} />
      <input placeholder="Budget" value={budgetAmount} onChange={(e) => setBudgetAmount(e.target.value)} />
      <button type="submit">Create project</button>
    </form>
  );
}
```

- [ ] **Step 5: Add list and create pages**

Create `frontend/src/features/projects/pages/ProjectsPage.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { listProjects } from '../api/list-projects';
import type { Project } from '../types';
import ProjectTable from '../components/ProjectTable';

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    listProjects().then(setProjects);
  }, []);

  return (
    <section>
      <h1>Chantiers</h1>
      <ProjectTable projects={projects} />
    </section>
  );
}
```

Create `frontend/src/features/projects/pages/NewProjectPage.tsx`:

```tsx
import ProjectForm from '../components/ProjectForm';
import { createProject, type CreateProjectPayload } from '../api/create-project';

export default function NewProjectPage() {
  async function handleSubmit(payload: CreateProjectPayload) {
    await createProject(payload);
  }

  return (
    <section>
      <h1>Nouveau chantier</h1>
      <ProjectForm onSubmit={handleSubmit} />
    </section>
  );
}
```

- [ ] **Step 6: Run the project table test**

Run:

```bash
cd frontend && npm run test -- ProjectTable.test.tsx
```

Expected:

```text
PASS
```

- [ ] **Step 7: Commit**

```bash
git add frontend/src/features/projects
git commit -m "feat: add project list and create screens"
```

## Task 12: Integrate Simple-Style Visual Foundations

**Files:**
- Modify: `frontend/src/styles/index.css`
- Modify: `frontend/src/components/layout/AppShell.tsx`
- Modify: `frontend/src/components/layout/Sidebar.tsx`
- Modify: `frontend/src/components/layout/Topbar.tsx`

- [ ] **Step 1: Write a failing visual acceptance check**

Create this manual checklist in `frontend/src/styles/index.css` as a comment at the top:

```css
/* FAILING CHECKLIST:
1. Sidebar layout missing
2. Topbar layout missing
3. KPI card styling missing
4. Admin spacing scale missing
*/
```

- [ ] **Step 2: Verify the styles are incomplete**

Run:

```bash
sed -n '1,40p' frontend/src/styles/index.css
```

Expected:

```text
FAILING CHECKLIST
```

- [ ] **Step 3: Replace with an admin layout CSS baseline**

Create `frontend/src/styles/index.css`:

```css
:root {
  --bg-app: #f4f6f8;
  --bg-sidebar: #313a46;
  --bg-panel: #ffffff;
  --text-main: #2f3944;
  --text-muted: #8391a2;
  --accent: #3b7ddd;
  --border: #e3eaef;
  --shadow: 0 6px 20px rgba(15, 23, 42, 0.06);
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: "Inter", sans-serif;
  color: var(--text-main);
  background: var(--bg-app);
}

#root {
  min-height: 100vh;
}

.app-shell {
  display: grid;
  grid-template-columns: 260px 1fr;
  min-height: 100vh;
}

.sidebar {
  background: var(--bg-sidebar);
  color: #fff;
  padding: 24px;
}

.sidebar ul {
  list-style: none;
  padding: 0;
  margin: 24px 0 0;
}

.sidebar li {
  padding: 10px 0;
  color: #c8d0d8;
}

.app-content {
  display: flex;
  flex-direction: column;
}

.topbar {
  background: var(--bg-panel);
  border-bottom: 1px solid var(--border);
  padding: 16px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.page-content {
  padding: 24px;
}

.card {
  background: var(--bg-panel);
  border: 1px solid var(--border);
  border-radius: 12px;
  box-shadow: var(--shadow);
  padding: 20px;
}
```

- [ ] **Step 4: Update layout components to use the CSS classes**

Modify `frontend/src/components/layout/AppShell.tsx`:

```tsx
import type { ReactNode } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

type AppShellProps = {
  children: ReactNode;
};

export default function AppShell({ children }: AppShellProps) {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-content">
        <Topbar />
        <main className="page-content">{children}</main>
      </div>
    </div>
  );
}
```

Modify `frontend/src/components/layout/Sidebar.tsx`:

```tsx
const navItems = [
  'Dashboard',
  'Chantiers',
  'DQE',
  'Execution',
  'Couts',
  'QSE',
  'Reporting',
  'Parametres',
];

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <h2>Chantier Platform</h2>
      <nav>
        <ul>
          {navItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
```

Modify `frontend/src/components/layout/Topbar.tsx`:

```tsx
export default function Topbar() {
  return (
    <header className="topbar">
      <input aria-label="Global search" placeholder="Search chantiers" />
      <button type="button">Notifications</button>
    </header>
  );
}
```

- [ ] **Step 5: Import the stylesheet in the app entrypoint**

Modify `frontend/src/main.tsx`:

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

- [ ] **Step 6: Run the frontend tests**

Run:

```bash
cd frontend && npm run test
```

Expected:

```text
PASS
```

- [ ] **Step 7: Commit**

```bash
git add frontend/src/styles frontend/src/components/layout frontend/src/main.tsx
git commit -m "feat: add simple-style admin visual foundation"
```

## Task 13: Final Foundation Verification

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Add final runbook verification commands to the README**

Append this section to `README.md`:

````md
## Foundation Verification

### Backend

```bash
cd backend
php artisan migrate:fresh --seed
php artisan test
```

### Frontend

```bash
cd frontend
npm run test
npm run build
```
````

- [ ] **Step 2: Run all backend tests**

Run:

```bash
cd backend && php artisan test
```

Expected:

```text
PASS
```

- [ ] **Step 3: Run all frontend tests**

Run:

```bash
cd frontend && npm run test
```

Expected:

```text
PASS
```

- [ ] **Step 4: Run the frontend production build**

Run:

```bash
cd frontend && npm run build
```

Expected:

```text
vite build completed successfully
```

- [ ] **Step 5: Commit**

```bash
git add README.md
git commit -m "docs: add foundation verification runbook"
```

## Follow-Up Plans Required After This One

Once this foundation is implemented and verified, create and execute the next plans in this order:

1. `Company Reference Data`
2. `Projects & Technical Base`
3. `DQE Engine v1`
4. `Execution & Daily Logs`
5. `Costs & Payments`
6. `QSE`
7. `Reporting & Exports`
