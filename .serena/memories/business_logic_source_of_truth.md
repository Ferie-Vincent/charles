# Business Logic — Source of Truth (règle impérative)

Before designing, implementing or modifying ANY feature, read `docs/logique-metier.md`.

It is the single source of truth for the BTP domain (Côte d'Ivoire context):
- Actors, roles, field hierarchies
- Full project lifecycle (AO → DGD)
- Contractual documents (DQE, DPGF, BPU, Situation de travaux…)
- Financial logic: FCFA/XOF, TVA 18% CI, retenue de garantie 5%, validation thresholds
- Irreversible workflows: situation → validée → payée ; BDC → approuvé → reçu
- Inviolable rules: 1 journal/day, DQE amount computed never typed, strict RBAC
- Automatic alerts and their triggers

Any technical decision (DB model, API endpoint, UI component, validation rule) must be consistent with it.
On conflict between dev intuition and `logique-metier.md`, the document wins.

Also see `CLAUDE.md` (repo root) for architecture, commands, feature roadmap.
Canonical financial metrics: `backend/app/Services/ProjectFinancialMetricsService.php`.
