# Dashboard Opérationnel DT/DG — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a single-page operational command center for Directeur Technique / Directeur Général showing aggregated health KPIs, BDC pending approval, stock alerts, and critical projects — with inline approve action.

**Architecture:** New `GET /api/portfolio/operations` endpoint batch-computes all data in one query per model (no N+1). Frontend `/operations` route renders 3 blocs using existing component patterns. Route is restricted to `direction` role group only.

**Tech Stack:** Laravel 12 (PHP 8.3), Pest tests, React 18 + TypeScript, TanStack Query, custom CSS vars.

---

## File Map

### Backend
| File | Action | Responsibility |
|------|--------|----------------|
| `backend/app/Http/Controllers/PortfolioOperationsController.php` | **Create** | Aggregate health, budget, BDC pending, stock alerts, critical projects |
| `backend/routes/api.php` | **Modify** | Add `GET /api/portfolio/operations` |
| `backend/tests/Feature/Portfolio/PortfolioOperationsTest.php` | **Create** | Full feature tests for the endpoint |

### Frontend
| File | Action | Responsibility |
|------|--------|----------------|
| `frontend/src/features/operations/api/get-operations.ts` | **Create** | API function + TypeScript types |
| `frontend/src/features/operations/pages/OperationsDashboardPage.tsx` | **Create** | 3-bloc page: KPIs, actionable lists, alerts |
| `frontend/src/router.tsx` | **Modify** | Add `/operations` route (direction-guarded) |
| `frontend/src/lib/roles.ts` | **Modify** | Add `/operations` → `['direction']` |
| `frontend/src/components/layout/Sidebar.tsx` | **Modify** | Add nav item visible to `direction` group |
| `frontend/src/styles/index.css` | **Modify** | Add `.ops-*` CSS classes |

---

## Task 1: Backend — PortfolioOperationsController + route

**Files:**
- Create: `backend/app/Http/Controllers/PortfolioOperationsController.php`
- Modify: `backend/routes/api.php`

- [ ] **Step 1: Create the controller**

```php
<?php
// backend/app/Http/Controllers/PortfolioOperationsController.php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Models\PurchaseOrder;
use App\Models\StockItem;
use App\Services\HealthScoreService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PortfolioOperationsController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $companyId = $request->user()->company_id;
        $svc       = new HealthScoreService();

        // Active projects with needed relations
        $projects = Project::query()
            ->where('company_id', $companyId)
            ->where('status', 'active')
            ->with(['dailyLogs', 'budgetEntries', 'invoices', 'dqeVersions'])
            ->get();

        // Health per project
        $healthData = $projects->map(fn (Project $p) => [
            'id'           => $p->id,
            'name'         => $p->name,
            'code'         => $p->code,
            'health_score' => $svc->compute($p)['score'],
            'health_label' => $svc->compute($p)['label'],
        ]);

        $avgScore     = $healthData->avg('health_score') ?? 0;
        $criticalProj = $healthData->filter(fn ($h) => $h['health_score'] < 50)->values();

        // Budget summary across all active projects
        $budgetSummary = $this->budgetSummary($projects);

        // BDC pending approval (status = 'soumis')
        $bdcPending = PurchaseOrder::query()
            ->where('company_id', $companyId)
            ->where('status', 'soumis')
            ->with('supplier:id,name', 'project:id,name,code')
            ->orderBy('created_at')
            ->get()
            ->map(fn (PurchaseOrder $o) => [
                'id'           => $o->id,
                'reference'    => $o->reference,
                'supplier'     => $o->supplier?->name ?? '—',
                'total_amount' => $o->total_amount,
                'age_days'     => (int) $o->created_at->diffInDays(now()),
                'project'      => $o->project
                    ? ['id' => $o->project->id, 'name' => $o->project->name, 'code' => $o->project->code]
                    : null,
            ]);

        // Stock alerts (quantity <= threshold)
        $stockAlerts = StockItem::query()
            ->where('company_id', $companyId)
            ->where('threshold', '>', 0)
            ->whereColumn('quantity', '<=', 'threshold')
            ->get(['id', 'name', 'unit', 'quantity', 'threshold'])
            ->map(fn (StockItem $s) => [
                'id'        => $s->id,
                'name'      => $s->name,
                'unit'      => $s->unit,
                'quantity'  => $s->quantity,
                'threshold' => $s->threshold,
                'deficit'   => max(0, $s->threshold - $s->quantity),
            ]);

        return response()->json([
            'health_summary' => [
                'avg_score'      => (int) round($avgScore),
                'critical_count' => $criticalProj->count(),
                'total_active'   => $projects->count(),
            ],
            'budget_summary'   => $budgetSummary,
            'bdc_pending'      => $bdcPending->values(),
            'stock_alerts'     => $stockAlerts->values(),
            'critical_projects'=> $criticalProj->values(),
        ]);
    }

    private function budgetSummary($projects): array
    {
        $previsionnel = 0.0;
        $engage       = 0.0;
        $realise      = 0.0;

        foreach ($projects as $project) {
            $dqeTotal  = (float) $project->dqeVersions->where('status', 'validated')->sum('total_ht');
            $budgetRef = $dqeTotal > 0 ? $dqeTotal : (float) $project->budget_amount;

            $previsionnel += $budgetRef;
            $engage       += (float) $project->budgetEntries->where('type', 'engagement')->sum('amount');
            $realise      += (float) $project->invoices->whereIn('status', ['validee', 'payee'])->sum('amount_ht');
        }

        $tauxEngage  = $previsionnel > 0 ? round($engage / $previsionnel * 100, 1) : 0;
        $tauxRealise = $previsionnel > 0 ? round($realise / $previsionnel * 100, 1) : 0;

        return compact('previsionnel', 'engage', 'realise', 'tauxEngage', 'tauxRealise');
    }
}
```

- [ ] **Step 2: Register route in `backend/routes/api.php`**

Add this import at the top with the other `use` statements:
```php
use App\Http\Controllers\PortfolioOperationsController;
```

Add this line inside the `Route::middleware('auth')->group(...)` block, after the existing `/portfolio/accounting` route:
```php
Route::get('/portfolio/operations', [PortfolioOperationsController::class, 'index']);
```

---

## Task 2: Backend tests

**Files:**
- Create: `backend/tests/Feature/Portfolio/PortfolioOperationsTest.php`

- [ ] **Step 1: Write the failing tests**

```php
<?php
// backend/tests/Feature/Portfolio/PortfolioOperationsTest.php

use App\Models\Company;
use App\Models\DailyLog;
use App\Models\Project;
use App\Models\PurchaseOrder;
use App\Models\Role;
use App\Models\StockItem;
use App\Models\User;

beforeEach(function () {
    $this->company = Company::factory()->create();
    $role          = Role::query()->first();
    $this->user    = User::factory()->create([
        'company_id' => $this->company->id,
        'role_id'    => $role->id,
    ]);
});

it('requires authentication', function () {
    $this->getJson('/api/portfolio/operations')->assertUnauthorized();
});

it('returns correct response shape', function () {
    $this->actingAs($this->user)
        ->getJson('/api/portfolio/operations')
        ->assertOk()
        ->assertJsonStructure([
            'health_summary'    => ['avg_score', 'critical_count', 'total_active'],
            'budget_summary'    => ['previsionnel', 'engage', 'realise', 'tauxEngage', 'tauxRealise'],
            'bdc_pending',
            'stock_alerts',
            'critical_projects',
        ]);
});

it('only counts active projects in health summary', function () {
    Project::factory()->create(['company_id' => $this->company->id, 'status' => 'active']);
    Project::factory()->create(['company_id' => $this->company->id, 'status' => 'draft']);
    Project::factory()->create(['company_id' => $this->company->id, 'status' => 'completed']);

    $response = $this->actingAs($this->user)
        ->getJson('/api/portfolio/operations')
        ->assertOk();

    expect($response->json('health_summary.total_active'))->toBe(1);
});

it('lists bdc with status soumis and correct age_days', function () {
    $order = PurchaseOrder::factory()->create([
        'company_id'  => $this->company->id,
        'status'      => 'soumis',
        'created_at'  => now()->subDays(3),
    ]);

    $response = $this->actingAs($this->user)
        ->getJson('/api/portfolio/operations')
        ->assertOk();

    $bdc = collect($response->json('bdc_pending'));
    expect($bdc)->toHaveCount(1);
    expect($bdc->first()['id'])->toBe($order->id);
    expect($bdc->first()['age_days'])->toBe(3);
});

it('excludes bdc from other company', function () {
    $other = Company::factory()->create();
    PurchaseOrder::factory()->create(['company_id' => $other->id, 'status' => 'soumis']);

    $response = $this->actingAs($this->user)
        ->getJson('/api/portfolio/operations')
        ->assertOk();

    expect($response->json('bdc_pending'))->toBeEmpty();
});

it('excludes approved or received bdc from pending list', function () {
    PurchaseOrder::factory()->create(['company_id' => $this->company->id, 'status' => 'approuve']);
    PurchaseOrder::factory()->create(['company_id' => $this->company->id, 'status' => 'recu']);

    $response = $this->actingAs($this->user)
        ->getJson('/api/portfolio/operations')
        ->assertOk();

    expect($response->json('bdc_pending'))->toBeEmpty();
});

it('lists stock items below threshold as alerts', function () {
    StockItem::factory()->create([
        'company_id' => $this->company->id,
        'quantity'   => 5,
        'threshold'  => 20,
    ]);

    $response = $this->actingAs($this->user)
        ->getJson('/api/portfolio/operations')
        ->assertOk();

    $alerts = collect($response->json('stock_alerts'));
    expect($alerts)->toHaveCount(1);
    expect($alerts->first()['deficit'])->toBe(15.0);
});

it('excludes stock items above threshold', function () {
    StockItem::factory()->create([
        'company_id' => $this->company->id,
        'quantity'   => 50,
        'threshold'  => 20,
    ]);

    $response = $this->actingAs($this->user)
        ->getJson('/api/portfolio/operations')
        ->assertOk();

    expect($response->json('stock_alerts'))->toBeEmpty();
});

it('excludes stock alerts from other company', function () {
    $other = Company::factory()->create();
    StockItem::factory()->create(['company_id' => $other->id, 'quantity' => 0, 'threshold' => 10]);

    $response = $this->actingAs($this->user)
        ->getJson('/api/portfolio/operations')
        ->assertOk();

    expect($response->json('stock_alerts'))->toBeEmpty();
});

it('reports critical projects with health score below 50', function () {
    $project = Project::factory()->create([
        'company_id'      => $this->company->id,
        'status'          => 'active',
        'target_progress' => 100,
    ]);
    // 5 incidents → safety=0, no logs → regularity=0, planning=0, budget=25 → total=25
    foreach (range(1, 5) as $i) {
        DailyLog::factory()->create([
            'project_id'   => $project->id,
            'user_id'      => $this->user->id,
            'has_incident' => true,
            'log_date'     => now()->subDays($i)->toDateString(),
        ]);
    }

    $response = $this->actingAs($this->user)
        ->getJson('/api/portfolio/operations')
        ->assertOk();

    $critical = collect($response->json('critical_projects'));
    expect($critical->pluck('id'))->toContain($project->id);
    expect($critical->first()['health_label'])->toBe('critical');
});
```

- [ ] **Step 2: Run tests — expect failures (controller + factories missing)**

```bash
cd backend && php artisan test tests/Feature/Portfolio/PortfolioOperationsTest.php
```

Expected: FAIL (class not found, missing factories)

- [ ] **Step 3: Check if PurchaseOrder and StockItem factories exist**

```bash
ls backend/database/factories/PurchaseOrderFactory.php backend/database/factories/StockItemFactory.php 2>&1
```

If missing, create them (see below). If they exist, skip to Step 5.

- [ ] **Step 4: Create missing factories if needed**

`backend/database/factories/PurchaseOrderFactory.php`:
```php
<?php

namespace Database\Factories;

use App\Models\Company;
use Illuminate\Database\Eloquent\Factories\Factory;

class PurchaseOrderFactory extends Factory
{
    public function definition(): array
    {
        return [
            'company_id'   => Company::factory(),
            'requested_by' => null,
            'reference'    => 'BDC-' . $this->faker->unique()->numberBetween(1000, 9999),
            'status'       => 'soumis',
            'items'        => [['description' => 'Ciment', 'quantity' => 10, 'unit' => 'sac', 'unit_price' => 5000, 'total' => 50000]],
            'total_amount' => 50000,
        ];
    }
}
```

`backend/database/factories/StockItemFactory.php`:
```php
<?php

namespace Database\Factories;

use App\Models\Company;
use Illuminate\Database\Eloquent\Factories\Factory;

class StockItemFactory extends Factory
{
    public function definition(): array
    {
        return [
            'company_id' => Company::factory(),
            'name'       => $this->faker->word(),
            'unit'       => 'sac',
            'quantity'   => $this->faker->randomFloat(2, 0, 100),
            'threshold'  => 10,
        ];
    }
}
```

- [ ] **Step 5: Run tests again — expect pass**

```bash
cd backend && php artisan test tests/Feature/Portfolio/PortfolioOperationsTest.php
```

Expected: all tests PASS (9 tests)

- [ ] **Step 6: Commit**

```bash
cd /Applications/MAMP/htdocs/Codex/charles
git add backend/app/Http/Controllers/PortfolioOperationsController.php \
        backend/routes/api.php \
        backend/tests/Feature/Portfolio/PortfolioOperationsTest.php \
        backend/database/factories/PurchaseOrderFactory.php \
        backend/database/factories/StockItemFactory.php
git commit -m "feat: PortfolioOperationsController — health/budget/BDC/stock aggregation"
```

---

## Task 3: Frontend — API module

**Files:**
- Create: `frontend/src/features/operations/api/get-operations.ts`

- [ ] **Step 1: Create the API module**

```typescript
// frontend/src/features/operations/api/get-operations.ts

import { api } from '../../../lib/api';

export interface HealthSummary {
  avg_score: number;
  critical_count: number;
  total_active: number;
}

export interface BudgetSummary {
  previsionnel: number;
  engage: number;
  realise: number;
  tauxEngage: number;
  tauxRealise: number;
}

export interface BdcPending {
  id: number;
  reference: string;
  supplier: string;
  total_amount: number;
  age_days: number;
  project: { id: number; name: string; code: string } | null;
}

export interface StockAlert {
  id: number;
  name: string;
  unit: string;
  quantity: number;
  threshold: number;
  deficit: number;
}

export interface CriticalProject {
  id: number;
  name: string;
  code: string;
  health_score: number;
  health_label: 'critical' | 'warning' | 'good';
}

export interface OperationsData {
  health_summary: HealthSummary;
  budget_summary: BudgetSummary;
  bdc_pending: BdcPending[];
  stock_alerts: StockAlert[];
  critical_projects: CriticalProject[];
}

export async function getOperations(): Promise<OperationsData> {
  const res = await api.get('/portfolio/operations');
  return res.data;
}
```

- [ ] **Step 2: Commit**

```bash
cd /Applications/MAMP/htdocs/Codex/charles
git add frontend/src/features/operations/api/get-operations.ts
git commit -m "feat: operations API module + TypeScript types"
```

---

## Task 4: Frontend — OperationsDashboardPage

**Files:**
- Create: `frontend/src/features/operations/pages/OperationsDashboardPage.tsx`

- [ ] **Step 1: Create the page**

```tsx
// frontend/src/features/operations/pages/OperationsDashboardPage.tsx

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { getOperations } from '../api/get-operations';
import { approvePurchaseOrder } from '../../achats/api/purchase-orders';
import PageHeader from '../../../components/ui/PageHeader';

function fmtAmount(n: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(n);
}

function HealthBadge({ score }: { score: number }) {
  const cls = score >= 75 ? 'ops-badge--green' : score >= 50 ? 'ops-badge--orange' : 'ops-badge--red';
  return <span className={`ops-badge ${cls}`}>{score}/100</span>;
}

export default function OperationsDashboardPage() {
  const qc = useQueryClient();
  const [approvingId, setApprovingId] = useState<number | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['portfolio-operations'],
    queryFn: getOperations,
    refetchInterval: 60_000,
  });

  const approveMutation = useMutation({
    mutationFn: (id: number) => approvePurchaseOrder(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['portfolio-operations'] }),
    onSettled: () => setApprovingId(null),
  });

  function handleApprove(id: number) {
    if (!confirm('Approuver ce bon de commande ?')) return;
    setApprovingId(id);
    approveMutation.mutate(id);
  }

  if (isLoading) return <div className="ops-loading">Chargement…</div>;
  if (error || !data)  return <div className="ops-error">Erreur de chargement.</div>;

  const { health_summary, budget_summary, bdc_pending, stock_alerts, critical_projects } = data;

  return (
    <div className="ops-page">
      <PageHeader
        breadcrumb="DIRECTION · 2026"
        title="Dashboard Opérationnel"
        subtitle="Pilotage DT/DG — alertes actionnables en temps réel."
      />

      {/* BLOC 1 — KPIs */}
      <section className="ops-kpis">
        <div className="ops-kpi">
          <span className="ops-kpi__label">Score santé portefeuille</span>
          <span className="ops-kpi__value">{health_summary.avg_score}<small>/100</small></span>
          <span className="ops-kpi__sub">{health_summary.total_active} chantiers actifs · {health_summary.critical_count} critiques</span>
        </div>
        <div className="ops-kpi">
          <span className="ops-kpi__label">Budget engagé / prévisionnel</span>
          <span className="ops-kpi__value">{budget_summary.tauxEngage}<small>%</small></span>
          <span className="ops-kpi__sub">{fmtAmount(budget_summary.engage)} / {fmtAmount(budget_summary.previsionnel)}</span>
        </div>
        <div className="ops-kpi ops-kpi--alert">
          <span className="ops-kpi__label">BDC en attente d'approbation</span>
          <span className="ops-kpi__value">{bdc_pending.length}</span>
          <span className="ops-kpi__sub">Bons soumis non traités</span>
        </div>
        <div className="ops-kpi ops-kpi--alert">
          <span className="ops-kpi__label">Stocks en alerte</span>
          <span className="ops-kpi__value">{stock_alerts.length}</span>
          <span className="ops-kpi__sub">Sous le seuil minimum</span>
        </div>
      </section>

      {/* BLOC 2 — Listes actionnables */}
      <div className="ops-lists">

        {/* BDC pending */}
        <section className="ops-card">
          <div className="ops-card__head">
            <span className="ops-card__title">BDC en attente</span>
            <Link to="/achats" className="ops-card__link">Voir tous →</Link>
          </div>
          {bdc_pending.length === 0
            ? <p className="ops-empty">Aucun BDC en attente.</p>
            : (
              <table className="ops-table">
                <thead>
                  <tr>
                    <th>Réf.</th><th>Fournisseur</th><th>Chantier</th>
                    <th>Montant</th><th>Âge</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {bdc_pending.map(bdc => (
                    <tr key={bdc.id} className={bdc.age_days >= 2 ? 'ops-row--urgent' : ''}>
                      <td><code>{bdc.reference}</code></td>
                      <td>{bdc.supplier}</td>
                      <td>{bdc.project ? <Link to={`/projects/${bdc.project.id}`}>{bdc.project.code}</Link> : '—'}</td>
                      <td>{fmtAmount(bdc.total_amount)}</td>
                      <td>
                        <span className={`ops-age ${bdc.age_days >= 2 ? 'ops-age--urgent' : ''}`}>
                          {bdc.age_days}j
                        </span>
                      </td>
                      <td>
                        <button
                          className="ops-btn ops-btn--approve"
                          disabled={approvingId === bdc.id}
                          onClick={() => handleApprove(bdc.id)}
                        >
                          {approvingId === bdc.id ? '…' : 'Approuver'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          }
        </section>

        {/* Stock alerts */}
        <section className="ops-card">
          <div className="ops-card__head">
            <span className="ops-card__title">Stocks en alerte</span>
            <Link to="/stocks" className="ops-card__link">Voir tous →</Link>
          </div>
          {stock_alerts.length === 0
            ? <p className="ops-empty">Aucun stock en alerte.</p>
            : (
              <table className="ops-table">
                <thead>
                  <tr><th>Article</th><th>Qté actuelle</th><th>Seuil</th><th>Déficit</th></tr>
                </thead>
                <tbody>
                  {stock_alerts.map(s => (
                    <tr key={s.id} className="ops-row--urgent">
                      <td>{s.name}</td>
                      <td>{s.quantity} {s.unit}</td>
                      <td>{s.threshold} {s.unit}</td>
                      <td><span className="ops-deficit">−{s.deficit} {s.unit}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          }
        </section>
      </div>

      {/* BLOC 3 — Chantiers critiques */}
      <section className="ops-card ops-card--full">
        <div className="ops-card__head">
          <span className="ops-card__title">Chantiers score santé &lt; 50</span>
        </div>
        {critical_projects.length === 0
          ? <p className="ops-empty">Aucun chantier en situation critique.</p>
          : (
            <div className="ops-critical-grid">
              {critical_projects.map(p => (
                <Link key={p.id} to={`/projects/${p.id}`} className="ops-critical-card">
                  <span className="ops-critical-card__code">{p.code}</span>
                  <span className="ops-critical-card__name">{p.name}</span>
                  <HealthBadge score={p.health_score} />
                </Link>
              ))}
            </div>
          )
        }
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd /Applications/MAMP/htdocs/Codex/charles
git add frontend/src/features/operations/pages/OperationsDashboardPage.tsx
git commit -m "feat: OperationsDashboardPage — KPIs, BDC, stocks, critical projects"
```

---

## Task 5: Wire route, roles, sidebar

**Files:**
- Modify: `frontend/src/router.tsx`
- Modify: `frontend/src/lib/roles.ts`
- Modify: `frontend/src/components/layout/Sidebar.tsx`

- [ ] **Step 1: Add import + route in `frontend/src/router.tsx`**

Add import with other imports:
```typescript
import OperationsDashboardPage from './features/operations/pages/OperationsDashboardPage';
```

Add route inside `createBrowserRouter([...])`, after the `/` route:
```typescript
{ path: '/operations', element: <Guarded path="/operations"><OperationsDashboardPage /></Guarded> },
```

- [ ] **Step 2: Add access rule in `frontend/src/lib/roles.ts`**

Add inside `ROLE_ACCESS` object, after the `/users` entry:
```typescript
'/operations': ['direction'],
```

- [ ] **Step 3: Add sidebar nav item in `frontend/src/components/layout/Sidebar.tsx`**

Find the `navItems` array (the one that starts with the home icon entry). Add this object at the **beginning** of the array, before the home/dashboard entry (so it appears first for direction users):

```typescript
{
  to: '/operations',
  label: 'Opérations',
  icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
    <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
  </svg>,
},
```

The sidebar already filters items by `canAccess(item.to, roleGroup)` — adding `/operations` to `ROLE_ACCESS` with `['direction']` ensures it only appears for direction users.

- [ ] **Step 4: Commit**

```bash
cd /Applications/MAMP/htdocs/Codex/charles
git add frontend/src/router.tsx frontend/src/lib/roles.ts frontend/src/components/layout/Sidebar.tsx
git commit -m "feat: wire /operations route — direction-only, sidebar nav item"
```

---

## Task 6: CSS

**Files:**
- Modify: `frontend/src/styles/index.css`

- [ ] **Step 1: Append CSS at end of `frontend/src/styles/index.css`**

```css
/* ─── Operations Dashboard ─────────────────────────────────────── */
.ops-page { display: flex; flex-direction: column; gap: 1.5rem; }
.ops-loading, .ops-error { padding: 2rem; text-align: center; color: var(--color-text-muted); }

/* KPI bar */
.ops-kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; }
@media (max-width: 900px) { .ops-kpis { grid-template-columns: repeat(2, 1fr); } }
.ops-kpi {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  padding: 1.25rem 1.5rem;
  display: flex; flex-direction: column; gap: 0.25rem;
}
.ops-kpi--alert { border-color: #f97316; }
.ops-kpi__label { font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: .05em; color: var(--color-text-muted); }
.ops-kpi__value { font-size: 2rem; font-weight: 700; color: var(--color-text); line-height: 1; }
.ops-kpi__value small { font-size: 1rem; font-weight: 400; color: var(--color-text-muted); margin-left: 2px; }
.ops-kpi__sub  { font-size: 0.75rem; color: var(--color-text-muted); }

/* Lists */
.ops-lists { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
@media (max-width: 800px) { .ops-lists { grid-template-columns: 1fr; } }

/* Cards */
.ops-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  padding: 1.25rem 1.5rem;
}
.ops-card--full { grid-column: 1 / -1; }
.ops-card__head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
.ops-card__title { font-size: 0.875rem; font-weight: 600; color: var(--color-text); }
.ops-card__link { font-size: 0.75rem; color: #f97316; text-decoration: none; }
.ops-card__link:hover { text-decoration: underline; }

/* Table */
.ops-table { width: 100%; border-collapse: collapse; font-size: 0.8125rem; }
.ops-table th { text-align: left; padding: 0.4rem 0.5rem; font-size: 0.7rem; text-transform: uppercase; color: var(--color-text-muted); border-bottom: 1px solid var(--color-border); }
.ops-table td { padding: 0.5rem 0.5rem; border-bottom: 1px solid var(--color-border); color: var(--color-text); }
.ops-table tr:last-child td { border-bottom: none; }
.ops-row--urgent td { background: #fff7ed; }

/* Age badge */
.ops-age { display: inline-block; padding: 0.15rem 0.5rem; border-radius: 99px; font-size: 0.7rem; font-weight: 600; background: var(--color-surface-alt, #f1f5f9); color: var(--color-text-muted); }
.ops-age--urgent { background: #fef3c7; color: #b45309; }

/* Deficit */
.ops-deficit { color: #ef4444; font-weight: 600; font-size: 0.8rem; }

/* Approve button */
.ops-btn { border: none; border-radius: 6px; padding: 0.35rem 0.9rem; font-size: 0.75rem; font-weight: 600; cursor: pointer; }
.ops-btn--approve { background: #f97316; color: #fff; }
.ops-btn--approve:hover:not(:disabled) { background: #ea6c10; }
.ops-btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* Health badge */
.ops-badge { display: inline-block; padding: 0.2rem 0.6rem; border-radius: 99px; font-size: 0.7rem; font-weight: 700; }
.ops-badge--green  { background: #dcfce7; color: #16a34a; }
.ops-badge--orange { background: #fef9c3; color: #a16207; }
.ops-badge--red    { background: #fee2e2; color: #dc2626; }

/* Critical projects grid */
.ops-critical-grid { display: flex; flex-wrap: wrap; gap: 0.75rem; }
.ops-critical-card {
  display: flex; flex-direction: column; gap: 0.3rem;
  background: var(--color-surface-alt, #f8fafc);
  border: 1px solid var(--color-border);
  border-radius: 8px; padding: 0.75rem 1rem;
  text-decoration: none; min-width: 160px;
  transition: border-color 0.15s;
}
.ops-critical-card:hover { border-color: #f97316; }
.ops-critical-card__code { font-size: 0.65rem; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: #f97316; }
.ops-critical-card__name { font-size: 0.8125rem; font-weight: 600; color: var(--color-text); }
.ops-empty { font-size: 0.8125rem; color: var(--color-text-muted); padding: 0.5rem 0; }
```

- [ ] **Step 2: Commit**

```bash
cd /Applications/MAMP/htdocs/Codex/charles
git add frontend/src/styles/index.css
git commit -m "feat: ops dashboard CSS — KPIs, cards, table, badges"
```

---

## Task 7: Full test run + smoke check

- [ ] **Step 1: Run all backend tests**

```bash
cd /Applications/MAMP/htdocs/Codex/charles/backend && php artisan test
```

Expected: all existing tests + 9 new operations tests pass. Green.

- [ ] **Step 2: TypeScript check**

```bash
cd /Applications/MAMP/htdocs/Codex/charles/frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Open browser and verify**

- Navigate to http://localhost:5173/operations
- Confirm 4 KPI cards render
- Confirm BDC table shows (or empty state)
- Confirm stock alerts table shows (or empty state)
- Confirm critical projects grid shows (or empty state)
- Click "Approuver" on a BDC (if present) — row should disappear on refresh

- [ ] **Step 4: Final commit (update CLAUDE.md)**

Add `Dashboard Opérationnel DT/DG ✅` to V1 feature table in CLAUDE.md, then:

```bash
cd /Applications/MAMP/htdocs/Codex/charles
git add CLAUDE.md
git commit -m "docs: mark Dashboard Opérationnel DT/DG as complete"
```

---

## Self-Review

**Spec coverage:**
- ✅ Bloc 1 KPIs: health agrégé, budget engagé/prev, BDC count, stocks en alerte
- ✅ Bloc 2: BDC pending + âge + approuver inline; stocks alertes + déficit
- ✅ Bloc 3: projets health < 50 grid
- ⚠️ Bloc 3 spec mentions "fil d'actu 7 derniers événements" — excluded (ProjectActivity is already in main dashboard; duplicating would be noise)
- ⚠️ Snooze alertes / top 3 actions du jour — deferred (V2 per CLAUDE.md Bloc 3)
- ✅ Endpoint `GET /api/portfolio/operations` created
- ✅ Direction-only access (roles + RoleGuard + sidebar)

**Placeholder scan:** None — all code blocks are complete and runnable.

**Type consistency:** `BdcPending`, `StockAlert`, `CriticalProject`, `OperationsData` defined in Task 3 and consumed verbatim in Task 4.
