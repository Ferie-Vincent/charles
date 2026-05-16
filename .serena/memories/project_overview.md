# Chantier Platform

Multi-project construction management web app (BTP industry). Replaces Excel workflows.

## Purpose
Covers: project portfolio, DQE auto-generation, execution tracking, cost piloting, QSE, direction reporting.

## Structure
Monorepo:
- `backend/` — Laravel 12 API (http://localhost:8000)
- `frontend/` — React SPA (http://localhost:5173 or 5174)
- `docs/` — product spec and implementation plans

## Multi-tenancy
All data queries scoped by `company_id`. Users belong to one company (V1).

## Roles (7 slugs seeded)
direction, directeur-technique, conducteur-travaux, chef-chantier, metreur-economiste, comptable, lecture-seule
