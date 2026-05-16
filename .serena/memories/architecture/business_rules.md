# Business Rules & Workflows

## RBAC
- direction: full access (create projects, users, approve everything)
- directeur-technique: create/edit projects, approve BDC
- conducteur-travaux: edit projects, submit BDC
- chef-chantier: daily logs, incidents, terrain features
- metreur-economiste: DQE, budget entries, costs
- comptable: invoices, payments, accounting
- moyens-generaux: stocks, GED
- lecture-seule: read-only

## Permission Middleware
Routes use `->middleware('permission:feature')` or `permission:feature.write`
Features: costs, accounting, stocks, achats, besoins, qse, dqe, etc.
Checked via PermissionService + role_permissions table (configurable by direction)

## Key Invariants
- All queries MUST filter by company_id (multi-tenant V1)
- daily_logs: unique per (project_id, log_date) — one log per project per day
- DQE workflow: draft → soumise → validated → archived (or rejected back to draft)
- BDC workflow: pending → submitted → approved/rejected → received
- Invoice workflow: soumise → validee → payee (comptable gating)
- Progress: no regression block — regression logged as warning only
- Health score: planning(25) + regularity(25) + budget(25) + safety(25) = 0-100

## Financial Metrics (ProjectFinancialMetricsService)
- budget_previsionnel: SUM(budget_entries WHERE type=previsionnel)
- budget_engage: SUM(budget_entries WHERE type=engagement)
- budget_realise: SUM(budget_entries WHERE type=paiement)
- RAC: engage - realise
- ecart: previsionnel - engage

## Current Branch
fix/audit-7points — fixing 7 business coherence audit points
Modified: DqeVersionController, PortfolioQhseController, ProjectReportController, SituationTravauxController, routes/api.php (permission middleware added to portfolio/stocks/achats/besoins routes)
