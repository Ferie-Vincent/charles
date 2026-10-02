# Corrections logique métier — Round 1 (party mode BMAD)

> Source : table de synthèse du round 1 (Mary / Winston / John), 2026-10-01.
> Branche : `fix/logique-metier-round1`. Tests : Pest sur MySQL MAMP (port 8889).
> **Statut 2026-10-02 : lots A → G livrés, 275/275 tests backend, 25/25 frontend, build OK.**

## Constat après lecture du code (écarts avec les affirmations des agents)

| Point agent | Réalité code | Conséquence |
|---|---|---|
| #5 `budget_score = 25` fixe | Déjà corrigé dans `ProjectMetricsService::computeBudgetScore` | **Reste** : `BuildProjectSnapshots` additionne encore `+ 25` en dur et lit `budget_entries.paiement` au lieu du service canonique → snapshots IA faux |
| #4 `stock_movements` sans `project_id` | Colonne existe déjà (nullable) | **Reste** : aucune valorisation (pas de `unit_cost`), aucun rapprochement journal ↔ stock |
| #7 TVA / RG en dur | `config/btp.php` (18 / 5) utilisé par `SituationTravauxController` ; `InvoiceController` défaut 18 | **Reste** : pas de surcharge projet ni company |
| #1 engagé matérialisé | 4 listeners écrivent/modifient `budget_entries.engagement` (create / clear / restore / reverse) ; aucune clé d'idempotence | Confirmé |
| #2 idempotence | Transitions = `if status !== X` en PHP puis `update()` ; aucune garde conditionnelle SQL (sauf `markReceived` + `record`) | Confirmé |
| #3 trésorerie borgne | `BudgetController::build90jBuckets` = sorties uniquement | Confirmé |
| #6 deux avancements | Health score + `CheckAvancementRetard` lisent uniquement `daily_logs.progress_percent` | Confirmé |
| #8 snapshots IA | Briefing affiche déjà `data_date` ; prompt sans garde-fou décisionnel | Partiel |
| #9 acteurs externes | `validee_moe` = visa MOE existe. Manque : service fait / ordre de paiement MOA, facture sous-traitant sans RG par défaut | Confirmé |

## Décisions prises (hypothèses explicites — à confirmer par Vincent)

- **D1 — Engagé** : on garde les `budget_entries` matérialisées (l'UI budget les liste) mais elles deviennent **convergentes** : clé `(source_type, source_id, type)` unique en DB + un seul point de calcul `BudgetEntry::syncBdcEngagement()` qui recompute `total_bdc − Σ factures (validée|payée) liées` à chaque événement. Plus d'`increment`/`decrement` cumulatifs. Résultat identique à un calcul à la lecture, sans refonte UI.
- **D2 — Idempotence** : helper `Transition::apply($model, $from, $updates)` = `UPDATE … WHERE id = ? AND status = ?` ; 0 ligne → `StateConflictException` → HTTP 409. Pas d'`Idempotency-Key` client (le 409 suffit : la seconde requête échoue au lieu de doubler).
- **D3 — Avancement** : l'avancement **certifié** (dernière situation `validee_moe`/`payee`, `avancement_pct`) prime sur le déclaratif journal pour le Health Score et l'alerte retard, s'il date de moins de 60 jours. Sinon journal. Les deux valeurs + `progress_source` sont exposées.
- **D4 — Paramètres financiers** : `tva_rate`, `retenue_garantie_pct`, `delai_paiement_jours` sur `companies` (défauts 18 / 5 / 60) et surcharge nullable sur `projects`. Résolution : projet → company → `config/btp`.
- **D5 — Trésorerie entrante** : une situation non payée dont le statut ≥ `soumise` génère une **créance attendue** = `net_a_payer` à la date `service_fait_at ?? validated_at ?? submitted_at` + `delai_paiement_jours`. Ajoutée au graphe 90 j (`encaissement`) et en KPI `creances_en_attente`.
- **D6 — Stock ↔ projet** : `unit_cost` (PU moyen pondéré) sur `stock_items`, mis à jour à chaque entrée depuis BDC ; `unit_cost`/`total_cost` figés sur chaque mouvement. Les sorties valorisées par projet sont exposées comme `materiaux_stock_consommes` **informatif** (pas ajouté à l'engagé : les BDC centraux sont déjà dans les factures). Rapprochement journal ↔ stock par nom de matériau dans `MaterialReceiptController`.
- **D7 — Acteurs externes** : pas de nouvel état bloquant (John a raison : la machine est déjà lourde). Champs datés non bloquants sur `situation_travaux` : `service_fait_at`, `ordre_paiement_ref`. Endpoint `PATCH …/situations/{id}/service-fait` (comptable / direction). Facture d'un fournisseur `sous-traitance` → RG par défaut = taux projet.
- **D8 — IA** : le prompt du briefing interdit toute recommandation d'approbation chiffrée ; réponse expose `data_as_of` (horodatage snapshot) ; l'UI affiche « indicatif ».
- **Hors code (John #10–13)** : consignés dans `docs/decisions-produit-2026-10-01.md` — validation terrain, usage réel vs seed, simplification éventuelle des workflows.

## Lots

### Lot A — Intégrité finance
- [x] Migration `budget_entries` : `source_type`, `source_id`, unique `(source_type, source_id, type)` + backfill
- [x] `BudgetEntry::syncBdcEngagement()` ; listeners BDC/facture réécrits en upsert convergent
- [x] `CreateBudgetPaymentOnInvoicePaid`, `CreatePreEngagementOnDemandeBesoinApproved`, `DemandeBesoinController::record`, `SituationTravauxController::pay` → upsert par source
- [x] `App\Support\Transition` + `StateConflictException` (409) ; appliqué à `WorkflowService`, `InvoiceController::pay`, `PurchaseOrderController` (approve/reject/submit/resubmit/cancel/markReceived), `SituationTravauxController` (9 transitions), `DqeVersionController::transition`
- [x] `ProjectMetricsService` délègue à `ProjectFinancialMetricsService` ; `BuildProjectSnapshots` utilise les deux services
- [x] Commande `budget:reconcile` (recalcule les engagements BDC, affiche les dérives)
- [x] Tests : double approve → 409 et une seule entry ; double pay → 409 ; clear/restore convergent ; snapshots = service canonique

### Lot B — Paramètres financiers + trésorerie entrante
- [x] Migrations `companies` / `projects` (D4) ; accessors `effective_*` sur `Project`
- [x] `SituationTravauxController` (store, preview, list) et `InvoiceController` (store, update) utilisent les taux effectifs
- [x] `UpdateProjectRequest` / `StoreProjectRequest` / `ProfileController::updateCompany` acceptent les nouveaux champs
- [x] `BudgetController::index` : `encaissements_prevus`, `creances`, bucket `encaissement`, `tresorerie_nette`
- [x] Frontend : `BudgetPanel` (barre encaissements + KPI créances), `ProjectForm` (3 champs), `SettingsPage` (défauts company)
- [x] Tests : taux projet > company > config ; créance attendue datée ; situation à 10 % RG

### Lot C — Avancement unique
- [x] `App\Services\ProjectProgressResolver`
- [x] `ProjectMetricsService` + `CheckAvancementRetard` + `BuildProjectSnapshots` l'utilisent ; `progress_source` exposé
- [x] Tests : situation validée récente prime ; journal sinon

### Lot D — Stock ↔ projet
- [x] Migrations `stock_items.unit_cost`, `stock_movements.unit_cost/total_cost`
- [x] Mise à jour PU moyen pondéré à la réception BDC ; valorisation des sorties
- [x] `ProjectFinancialMetricsService` : `materiaux_stock_consommes` ; `MaterialReceiptController` : rapprochement
- [x] Frontend : affichage PU et écart dans `StocksPage` / réception matériaux
- [x] Tests : PU pondéré ; sortie valorisée rattachée au projet

### Lot E — IA
- [x] Prompt briefing : garde-fou ; `data_as_of` ; UI « indicatif »

### Lot F — Acteurs externes
- [x] Migration `situation_travaux.service_fait_at`, `ordre_paiement_ref`
- [x] Endpoint service-fait + frontend (bouton sur situation `validee_moe`)
- [x] RG par défaut facture sous-traitant
- [x] Tests

### Lot G — Docs
- [x] `docs/logique-metier.md` : §5 (créances, paramètres), §3.3 (avancement certifié vs déclaré), §7.3 (valorisation), §14 (idempotence)
- [x] `docs/decisions-produit-2026-10-01.md`
- [x] `CLAUDE.md` : Laravel 13, 8 rôles, test DB port 8889
