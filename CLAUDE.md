# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**Chantier Platform** — multi-project construction management web app (BTP industry). Replaces a monolithic Excel workflow with a proper multi-tenant platform covering project portfolio, DQE (devis quantitatif estimatif) auto-generation, execution tracking, cost piloting, QSE, and direction reporting.

The product spec lives at `docs/superpowers/specs/2026-04-28-chantier-dqe-webapp-design.md`.  
The current implementation plan lives at `docs/superpowers/plans/2026-04-28-chantier-platform-foundation.md`.

## Repository Structure

Monorepo — two separate apps in one repo:

```
backend/    Laravel 12 API
frontend/   React SPA
docs/       Product spec and implementation plans
```

> **Status:** `backend/` and `frontend/` have not been scaffolded yet. Follow the implementation plan task-by-task.

## Tech Stack

| Layer | Tech |
|---|---|
| Backend | Laravel 12, PHP 8.3+, MySQL 8+ (via MAMP) |
| Auth | Laravel Sanctum (cookie-based session, not token) |
| Testing (backend) | Pest + PHPUnit |
| Frontend | React 18+, TypeScript, Vite |
| Routing / Data | React Router, TanStack Query, Axios |
| Testing (frontend) | Vitest + React Testing Library |
| Styles | Tailwind CSS + custom CSS vars (Simple admin template aesthetics) |

## Commands

### Backend

```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate:fresh --seed
php artisan serve
```

Run all backend tests:
```bash
cd backend && php artisan test
```

Run a single backend test file:
```bash
cd backend && php artisan test tests/Feature/Auth/LoginTest.php
```

### Frontend

```bash
cd frontend && npm install
cd frontend && npm run dev
```

Run all frontend tests:
```bash
cd frontend && npm run test
```

Run a single frontend test file:
```bash
cd frontend && npm run test -- LoginForm.test.tsx
```

Production build:
```bash
cd frontend && npm run build
```

## Architecture

### Backend

- **MySQL only** — no SQLite fallback. Test env must point to a real MySQL database (MAMP, port 3306).
- **Cookie session auth** via Sanctum. The `withCredentials: true` flag is required on the frontend Axios client.
- **Company-scoped queries** — every data-bearing query must filter by `request->user()->company_id`. Users belong to one company in V1.
- **Authorization via Laravel Policies** — use `$this->authorize()` in controllers, not inline `abort_unless` guards alone. Policies live in `backend/app/Policies/`.
- **Role seeding** — roles are seeded via `RoleSeeder`, not created in migrations. The seven seeded role slugs are: `direction`, `directeur-technique`, `conducteur-travaux`, `chef-chantier`, `metreur-economiste`, `comptable`, `lecture-seule`.

API routes are organized in `backend/routes/api.php`:
- Public: `GET /api/health`, `POST /api/auth/login`
- Auth-protected: `GET /api/auth/me`, `POST /api/auth/logout`, all resource routes

### Frontend

Feature-based folder layout under `src/`:

```
src/
  features/
    auth/       api/, components/, pages/, stores/
    dashboard/  pages/
    projects/   api/, components/, pages/, types.ts
  components/
    layout/     AppShell, Sidebar, Topbar
    guards/     ProtectedRoute
    ui/         Card, PageHeader
  lib/
    api.ts          Axios instance (baseURL + withCredentials)
    query-client.ts TanStack Query client
```

- `src/lib/api.ts` is the single Axios instance. All feature API modules import from it.
- `ProtectedRoute` takes an `isAuthenticated` prop and redirects to `/login` when false.
- The app shell uses CSS class names from `src/styles/index.css` (`app-shell`, `sidebar`, `topbar`, `page-content`, `card`).

### Data Model (V1 entities)

Core: `companies`, `users` (with `company_id` + `role_id`), `roles`, `projects`, `project_members`

Later modules add: `dqe_versions`, `dqe_lines`, `daily_logs`, `budget_lines`, `commitments`, `expenses`, `payments`, `incidents`, `quality_issues`, `safety_events`, `documents`

**Important distinction from Excel analysis:** The Excel "Acteurs" sheet mixes two types of people:
- App users (direction, conducteur, chef de chantier) → `users` + `project_members`
- On-site labor and subcontractors (maçon, ferrailleur, électricien) → need a separate `project_contacts` entity. These people do not log into the app.

### Seeded Reference Data (from Excel Paramètres sheet)

These enum values must be seeded, not hardcoded in migrations:

| Category | Values |
|---|---|
| Météo | Soleil, Nuageux, Pluie, Orage, Vent fort, Autre |
| État équipement | Bon, Moyen, Mauvais, Hors service |
| Type incident | Retard, Accident, Litige, Rupture stock, Panne, RAS, Autre |
| Type sécurité | EPI manquant, Accident, Quasi-accident, Non-respect consigne, Autre |
| Statut paiement | Payé, En attente, Partiel |
| Matériaux courants | Ciment, Fer, Sable, Gravier, Briques, Bois, Carrelage, Peinture, Autre |
| Catégories finances | Installation, Main d'œuvre, Matériaux, Transport, Équipements, Sous-traitance |

### Dashboard KPIs (from Excel Dashboard/Calculs sheets)

The dashboard must display these computed fields per project:
- Avancement réel % (last journal entry)
- Avancement cible % (from project identification)
- Retard/avance = réel − cible
- Dépenses réelles totales
- Taux de consommation budget = dépenses réelles / budget prévu
- Écart budget = prévu − réel
- Effectif moyen (average from journal entries)
- Nombre de jours suivis (journal entry count)
- Nb incidents, Nb non-conformités, Nb incidents sécurité
- Nb livraisons matériaux, Valeur matériaux total

Portfolio dashboard aggregates these across all active projects per company.

## Implementation Approach

The plan uses strict TDD:
1. Write the failing test
2. Verify it fails with the expected error
3. Implement the minimum code to pass
4. Verify pass
5. Commit

Follow this discipline. Do not implement before the test exists.

## Planned Module Sequence (after Platform Foundation)

1. Platform Foundation ← current plan
2. Company Reference Data
3. Projects & Technical Base
4. DQE Engine v1
5. Execution & Daily Logs
6. Costs & Payments
7. QSE
8. Reporting & Exports
