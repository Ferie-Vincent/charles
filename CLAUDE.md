# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**Chantier Platform** — multi-project construction management web app (BTP industry). Replaces a monolithic Excel workflow with a proper multi-tenant platform covering project portfolio, DQE auto-generation, execution tracking, cost piloting, QSE, and direction reporting.

The product spec lives at `docs/superpowers/specs/2026-04-28-chantier-dqe-webapp-design.md`.

## Repository Structure

Monorepo — two separate apps in one repo:

```
backend/    Laravel 12 API  (running on http://localhost:8000)
frontend/   React SPA       (running on http://localhost:5174 — Vite may use 5173 if 5174 is free)
docs/       Product spec and implementation plans
```

## Tech Stack

| Layer | Tech |
|---|---|
| Backend | Laravel 12, PHP 8.3+, MySQL 8+ (via MAMP, port 3306) |
| Auth | Laravel Sanctum (cookie-based session, not token) |
| Testing (backend) | Pest + PHPUnit |
| Frontend | React 18+, TypeScript, Vite |
| Routing / Data | React Router, TanStack Query, Axios |
| Testing (frontend) | Vitest + React Testing Library |
| Styles | Custom CSS vars (no Tailwind — plain CSS in `src/styles/index.css`) |
| Charts | Recharts |
| File Storage | MinIO (S3-compatible, self-hosted) — for photos and documents |

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

Production build:
```bash
cd frontend && npm run build
```

## Architecture

### Backend

- **MySQL only** — no SQLite fallback. Test env must point to a real MySQL database (MAMP, port 3306). DB: `chantier_platform`, test DB: `chantier_platform_test`.
- **Cookie session auth** via Sanctum. The `withCredentials: true` flag is required on the frontend Axios client.
- **Company-scoped queries** — every data-bearing query must filter by `request->user()->company_id`. Users belong to one company in V1.
- **Authorization via Laravel Policies** — use `$this->authorize()` in controllers. Policies live in `backend/app/Policies/`.
- **Role seeding** — roles are seeded via `RoleSeeder`, not created in migrations. Seven seeded role slugs: `direction`, `directeur-technique`, `conducteur-travaux`, `chef-chantier`, `metreur-economiste`, `comptable`, `lecture-seule`.
- **CORS** — allowed origins include both `http://localhost:5173` and `http://localhost:5174` (Vite port may vary).

API routes (`backend/routes/api.php`):
- Public: `GET /api/health`, `POST /api/auth/login`
- Auth-protected: `GET /api/auth/me`, `POST /api/auth/logout`, all resource routes

### Frontend

Feature-based folder layout under `src/`:

```
src/
  features/
    auth/           api/, components/, pages/, stores/
    dashboard/      api/, components/, pages/
    projects/       api/, components/, pages/, types.ts
    daily-logs/     api/, components/, data/, types.ts
  components/
    layout/         AppShell, Sidebar, Topbar
    guards/         ProtectedRoute
    ui/             Card, PageHeader
  lib/
    api.ts              Axios instance (baseURL + withCredentials)
    query-client.ts     TanStack Query client
  styles/
    index.css           All styles — CSS custom properties, component classes
```

- `src/lib/api.ts` is the single Axios instance. All feature API modules import from it.
- The app shell uses CSS class names from `src/styles/index.css`.

### Data Model (V1 entities)

**Live:**
- `companies`, `users` (company_id + role_id), `roles`, `projects`, `project_members`, `project_activities`
- `daily_logs` — weather, workers_count, progress_percent, has_incident, incident_type, equipment_status, materials_received (JSON), log_date (unique per project per day)
- `incidents` — type, severity (mineur/majeur/critique), description, location, corrective_action, witnesses, status, occurred_at, resolved_at
- `budget_entries` — type (previsionnel/engagement/paiement), category, label, amount, entry_date
- `project_reports` — filename, path, week_of, size_bytes, type (hebdo/manuel)

**Planned:**
- `dqe_versions`, `dqe_lines` — DQE engine
- `quality_issues`, `safety_events` — QSE module
- `documents` — GED (stored in MinIO)
- `project_contacts` — on-site labor/subcontractors who don't log into the app

**Upcoming schema additions needed:**
- `projects.latitude` + `projects.longitude` — required for map feature (#3)
- `projects.target_progress` (avancement_cible) — required for courbe S (#7) and health score (#2)

### Seeded Reference Data

| Category | Values |
|---|---|
| Météo | Soleil, Nuageux, Pluie, Orage, Vent fort, Autre |
| État équipement | Bon, Moyen, Mauvais, Hors service |
| Type incident | Retard, Accident, Litige, Rupture stock, Panne, RAS, Autre |
| Type sécurité | EPI manquant, Accident, Quasi-accident, Non-respect consigne, Autre |
| Statut paiement | Payé, En attente, Partiel |
| Matériaux courants | Ciment, Fer, Sable, Gravier, Briques, Bois, Carrelage, Peinture, Autre |
| Catégories finances | Installation, Main d'œuvre, Matériaux, Transport, Équipements, Sous-traitance |

## Implementation Approach

TDD discipline:
1. Write failing test
2. Verify it fails with expected error
3. Implement minimum code to pass
4. Verify pass
5. Commit

**User preference:** run tests at end of a feature batch, not between each individual file.

## Feature Roadmap V1

### Done ✅

| # | Feature | Notes |
|---|---------|-------|
| — | Platform Foundation | Auth, companies, users, roles, projects, project_members |
| — | Daily Logs module | Backend (store/index + policy + tests), form, history, KPIs |
| #29 | Référence Visuelle | ProgressVisualPicker — 6 phases BTP × 4 milestones |
| #27 | Leaderboard Chantier du Mois | Score = progress×0.5 + regularity×30 − incidents×10 |
| #30 | Interface Terrain Unifiée | Materials received chips + qty in DailyLogForm |
| #33 | Journal 3 Taps | Weather grid, workers number, no free text |
| #38 | Zéro Date | Auto-today enforced at DB level (unique constraint) |
| #39 | Zéro Texte | All structured fields, no textareas |
| #42 | Problème-First | Incident toggle is first field in form |
| #2 | Health Score 0–100 per project | Badge, tooltip breakdown, hero KPI |
| #1 | Alerte Persistante d'Action | localStorage persistence, AlertsPanel card |
| #3 | Carte Géo + Font Awesome markers | Leaflet, 13 markers CI, health color |
| #4 | Vue Chronologique Contractuelle | Gantt timeline, TimelinePage |
| #5 | Dashboard par Rôle | 4 role groups, conditional sections |
| #7 | Courbe S réel vs théorique | Recharts LineChart, carry-forward pattern |
| #8 | Galerie Photo Terrain Taguée | Upload/tag/delete, Storage::disk('public') |
| #9 | Comparateur Photo Avant/Après | clip-path slider, mouse+touch drag |
| #10 | Fiche Incident PDF auto-générée | DomPDF, fiche A4, statuts, signatures |
| #12 | Trésorerie Prévisionnelle 90j | BudgetEntry model, 3-month BarChart, KPIs (solde/taux) |
| #19 | Export Rapport PDF à la demande | On-demand A4 via "Exporter rapport" hero button |
| #18 | Rapport Hebdo Auto-PDF | Laravel scheduler Mon 07:00, archived + ReportsWidget |
| #23 | Score & Badge Sécurité Mensuel | SVG ring badge, severity-weighted formula, monthly window |
| #15 | Réception Matériaux Express | Agrège daily_logs.materials_received — grille totaux + historique |
| #24 | Gantt BTP Simplifié | Distribution estimée 6 phases, marqueurs Aujourd'hui + avancement réel |
| #25 | PWA Offline | vite-plugin-pwa, SW NetworkFirst API, OfflineBanner, manifest standalone |
| #28 | CR Réunion IA Auto-généré | Claude Haiku via Guzzle, modal structuré, markdown output — nécessite ANTHROPIC_API_KEY |

### Backlog V1 (ordered by dependency)

| # | Feature | Depends on | Priority |
|---|---------|-----------|---------|
| #13 | Situation Travaux Auto-générée | DQE engine | Low |
| #15 | Réception Matériaux Express | partially done in form | Low |
| #24 | Gantt BTP Simplifié | project phases | Low |
| #25 | PWA Offline | Service Worker | Low |
| #26 | Alertes WhatsApp | WhatsApp Business API | Low |
| #28 | CR Réunion IA Auto-généré | Claude API | Low |

### Deferred to end of V1

| # | Feature | Raison |
|---|---------|--------|
| #11 | GED Documents Chantier | Requires MinIO setup — defer to end of V1 |

### Health Score Formula (#2)

Score 0–100 per active project, computed from 4 groups:

```
planning_score  = avancement_réel >= avancement_cible ? 25 : max(0, 25 - (cible - réel) * 1.25)
regularity_score= min(total_logs / max(1, days_since_start), 1) * 25
budget_score    = 25  (placeholder until budget module)
safety_score    = max(0, 25 - incident_count * 5)
health_score    = planning_score + regularity_score + budget_score + safety_score
```

Thresholds: 🔴 < 50 · 🟠 50–74 · 🟢 ≥ 75

### Map Feature Notes (#3)

- Use **Leaflet.js** + **Font Awesome 6** for map markers
- Marker color = health score threshold (red/orange/green)
- Marker icon = project type (building, road, etc.) from FA
- Requires `latitude` + `longitude` columns on `projects` table
- Côte d'Ivoire default center: `[7.54, -5.55]`, zoom 7

### V2 (deferred)

#16 Surconsommation matériaux · #20 Mode présentation réunion · #21 Checklist QSE · #22 Kanban non-conformités

### Out of scope V1

#14 Paiements reçus client · #17 Portail Sous-traitant · #32 Fitness · #37 Client-facing features

## Module Build Sequence (updated)

1. ✅ Platform Foundation
2. ✅ Daily Logs (Execution module)
3. **Health Score + Map + Timeline** ← next
4. DQE Engine v1
5. Costs & Payments
6. QSE
7. Photos & GED (MinIO)
8. Reporting & Exports
9. PWA + WhatsApp
