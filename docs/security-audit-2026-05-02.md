# Security Audit — Chantier Platform

**Date:** 2026-05-02  
**Périmètre:** `backend/` (Laravel 12) + `frontend/` (React 18 + TypeScript)  
**Modèles audités:** 21 · **Contrôleurs:** 33 · **Migrations:** 31 · **Seeders:** 8  
**Statut:** Non production-ready — corriger avant tout déploiement

---

## Score de risque : Modéré (52/100)

| Sévérité | Nombre |
|----------|--------|
| CRITIQUE | 4 |
| ÉLEVÉ | 7 |
| MOYEN | 8 |
| FAIBLE | 6 |
| **Total** | **25** |

---

## Points forts ✅

- Company-scoping cohérent sur la majorité des endpoints
- `$fillable` explicite sur tous les 21 modèles (pas de mass assignment)
- Mots de passe hashés bcrypt, `password` en `$hidden`
- `.env` correctement gitignored, aucune clé API hardcodée dans le code
- Sanctum/CSRF configuré correctement pour SPA cookie-based auth
- `regenerate()` sur login (anti-session fixation)
- `invalidate()` + `regenerateToken()` sur logout
- UUID pour noms de fichiers GED (pas d'énumération possible)

---

## CRITIQUE — Corriger avant tout déploiement

### C1 — IDOR Incidents (cross-tenant read/write/delete)

**Fichier:** `app/Http/Controllers/ProjectIncidentController.php:62–98`  
**Routes:** `PATCH /projects/{project}/incidents/{incident}`, `DELETE`, `GET .../pdf`

Laravel résout `$project` et `$incident` indépendamment. Le contrôleur appelle `authorize('update', $project)` mais ne vérifie jamais que `$incident->project_id === $project->id`. Un utilisateur de la company A peut modifier/supprimer/télécharger le PDF d'un incident de la company B en devinant son ID entier.

**Fix:**
```php
// Ajouter en tête de update(), destroy(), pdf() :
abort_if($incident->project_id !== $project->id, 404);
```

---

### C2 — IDOR BudgetEntry (suppression cross-tenant)

**Fichier:** `app/Http/Controllers/BudgetController.php:60–64`  
**Route:** `DELETE /projects/{project}/budget/entries/{budgetEntry}`

Même pattern que C1. Le `destroy()` appelle `authorize('update', $project)` sans vérifier l'appartenance de `$budgetEntry` au projet. N'importe quel utilisateur autorisé sur un projet peut supprimer des entrées budgétaires de n'importe quelle autre entreprise.

**Fix:**
```php
abort_if($budgetEntry->project_id !== $project->id, 404);
```

---

### C3 — Path Traversal via `getClientOriginalName()`

**Fichiers:**
- `app/Http/Controllers/PurchaseOrderController.php:151,159`
- `app/Http/Controllers/InvoiceController.php:119–120`

```php
// Vulnérable — PurchaseOrderController.php:151
$path = "purchase-orders/{$purchaseOrder->id}/bl/" . $file->getClientOriginalName();

// Vulnérable — InvoiceController.php:120
$path = $file->storeAs("invoices/{$invoice->id}", $file->getClientOriginalName(), 'public');
```

Nom de fichier fourni par le client utilisé directement → traversée `../../`, écrasement de fichiers, overwrite si re-upload avec même nom. `GedController` fait correctement `Str::uuid()`.

**Fix:**
```php
$safe = Str::uuid() . '.' . $file->getClientOriginalExtension();
$path = "purchase-orders/{$purchaseOrder->id}/bl/{$safe}";
// Conserver le nom original séparément pour Content-Disposition si besoin
```

---

### C4 — APP_DEBUG=true dans .env et .env.example

**Fichiers:** `.env:4` · `.env.example:4`

Stack traces complètes (chemins, variables d'environnement, clés) renvoyées en réponse HTTP sur toute erreur 500. `.env.example` à `true` → tous les nouveaux déploiements héritent du mode debug.

**Fix:**
```bash
# .env.example
APP_ENV=production
APP_DEBUG=false
LOG_LEVEL=error
```

---

## ÉLEVÉ

### H1 — DqeVersionController : policy `view` sur toutes les mutations

**Fichier:** `app/Http/Controllers/DqeVersionController.php:28,70,86,96,115,141,157,183`

Toutes les actions d'écriture (`store`, `update`, `destroy`, `storeLine`, `updateLine`, `destroyLine`, `duplicate`) appellent `authorize('view', $project)`. Un rôle `lecture-seule` peut créer, modifier, supprimer des versions DQE représentant des millions de FCFA.

**Fix:**
```php
$this->authorize('update', $project); // mutations
$this->authorize('view', $project);   // index, show, pdf uniquement
```

---

### H2 — IDOR ProjectReport (téléchargement PDF cross-tenant)

**Fichier:** `app/Http/Controllers/ProjectReportController.php:36–46`

`download()` appelle `authorize('view', $project)` sans vérifier `$report->project_id === $project->id`. Un PDF financier d'une autre company est accessible en devinant l'ID du rapport.

**Fix:**
```php
abort_unless($report->project_id === $project->id, 404);
```

---

### H3 — Login sans rate limiting (brute-force illimité)

**Fichier:** `routes/api.php`

`POST /api/auth/login` n'a aucun middleware `throttle`. Attaques brute-force sans limite.

**Fix:**
```php
Route::post('/login', [AuthController::class, 'login'])
    ->middleware('throttle:10,1');
```

---

### H4 — Mot de passe seeders = `password` (tous comptes y compris Direction)

**Fichier:** `database/seeders/UserSeeder.php:65`

```php
'password' => Hash::make('password'),
```

Si `migrate:fresh --seed` est lancé en prod/staging, tous les comptes (y compris superadmin) sont immédiatement compromis par wordlist.

**Fix:**
```php
$pwd = Str::password(16);
// Log ou afficher le mot de passe généré à l'install
'password' => Hash::make($pwd),
```

---

### H5 — StockMovement `project_id` non scopé à la company

**Fichier:** `app/Http/Controllers/StockController.php:92–130`

```php
'project_id' => 'nullable|exists:projects,id',
```

`exists:projects,id` ne vérifie pas l'appartenance à la company de l'utilisateur. Un utilisateur peut associer un mouvement de stock au projet d'une autre company.

**Fix:**
```php
'project_id' => [
    'nullable',
    Rule::exists('projects', 'id')->where('company_id', $request->user()->company_id),
],
```
Même pattern à corriger dans `PurchaseOrderController` pour `supplier_id` et `project_id`.

---

### H6 — GedDocument `project_id` réassignable à un projet étranger

**Fichier:** `app/Http/Controllers/GedController.php:89–104`

`update()` accepte `project_id` avec `nullable|exists:projects,id` sans vérification de company → document réassignable à n'importe quel projet du système.

**Fix:**
```php
'project_id' => [
    'nullable',
    Rule::exists('projects', 'id')->where('company_id', $request->user()->company_id),
],
```

---

### H7 — `company_id` / `role_id` nullable → NullPointerException en session active

**Fichier:** `database/migrations/2026_04_30_152712_update_users_table_for_companies_and_roles.php:15–16`

Si un rôle ou une company est supprimé, `nullOnDelete()` met ces champs à NULL. Les contrôleurs appellent `$request->user()->role->name` → exception fatale. Avec `APP_DEBUG=true`, cela expose l'architecture interne.

**Fix:** Ajouter des null-guards dans tous les accès à `role->name`. Envisager `restrictOnDelete()` plutôt que `nullOnDelete()`.

---

## MOYEN

| # | Vulnérabilité | Fichier | Fix |
|---|---------------|---------|-----|
| M1 | GED upload : aucun MIME whitelist (upload `.php` possible) | `GedController.php:37–43` | Ajouter `mimes:pdf,doc,docx,jpg,png,zip,...` |
| M2 | `SESSION_ENCRYPT=false`, `SESSION_SECURE_COOKIE` non défini | `.env`, `config/session.php` | `SESSION_ENCRYPT=true`, `SESSION_SECURE_COOKIE=true` |
| M3 | `CORS allowed_methods: ['*']` trop permissif | `config/cors.php:20` | Lister les méthodes explicitement |
| M4 | `GET /api/users/roles` sans autorisation → énumération des slugs de rôles | `UserController.php:33–37` | Ajouter `authorize('create', User::class)` |
| M5 | `StoreProjectRequest::authorize()` retourne `true` hardcodé | `StoreProjectRequest.php:10` | Valider l'appartenance à une company |
| M6 | `SameSite=lax` avec `supports_credentials: true` | `config/session.php:202` | Passer à `strict` |
| M7 | Messages 503 révèlent noms providers IA (`GROQ_API_KEY`, `ANTHROPIC_API_KEY`) | `SituationTravauxController.php:27` | Message générique sans détails techniques |
| M8 | Aucun soft delete sur aucun modèle → données financières non auditables | Tous les modèles | `SoftDeletes` sur `users`, `projects`, `invoices`, `dqe_versions`, `incidents`, `budget_entries` |

---

## FAIBLE

| # | Vulnérabilité | Fichier |
|---|---------------|---------|
| F1 | `whereRaw` / `selectRaw` sans commentaire de sécurité (safe actuellement) | `DashboardController.php:74,81,83` |
| F2 | `SANCTUM_STATEFUL_DOMAINS` inclut `localhost` sans port (trop large) | `.env`, `config/sanctum.php` |
| F3 | Erreurs 500 peuvent exposer stack trace si debug activé en prod | `bootstrap/app.php` |
| F4 | `PermissionsController` utilise comparaison string `role->name !== 'direction'` au lieu de Policy | `PermissionsController.php:19,49` |
| F5 | `WhatsApp` test endpoint accessible à tout utilisateur authentifié (risque coût Twilio) | `WhatsAppTestController.php` |
| F6 | `password_reset_tokens.token` stocké sans contrainte d'unicité ou expiration explicite en migration | migration `create_users_table.php:27` |

---

## Feuille de route correctifs

### Sprint 1 — Priorité maximale (~2h)

```
C1 — abort_if(incident->project_id, 15 min)
C2 — abort_if(budgetEntry->project_id, 5 min)
H2 — abort_if(report->project_id, 5 min)
H1 — DqeVersionController view→update, 30 min)
C3 — Str::uuid() PurchaseOrder + Invoice, 1h)
H3 — throttle:10,1 sur login, 5 min)
C4 — APP_DEBUG=false dans .env.example, 5 min)
H4 — Str::password(16) dans UserSeeder, 10 min)
```

### Sprint 2 — Avant mise en production

```
H5 — Rule::exists + company_id dans StockController + PurchaseOrderController
H6 — Rule::exists + company_id dans GedController
M1 — MIME whitelist GED upload
M2 — SESSION_ENCRYPT + SESSION_SECURE_COOKIE
M3 — CORS methods explicites
```

### Sprint 3 — Hardening production

```
M4-M8 — Authorization + SameSite + messages d'erreur + soft deletes
F1-F6 — Code hygiene
```

---

## Fichiers à modifier (Sprint 1)

```
backend/app/Http/Controllers/ProjectIncidentController.php   (C1)
backend/app/Http/Controllers/BudgetController.php            (C2)
backend/app/Http/Controllers/ProjectReportController.php     (H2)
backend/app/Http/Controllers/DqeVersionController.php        (H1)
backend/app/Http/Controllers/PurchaseOrderController.php     (C3)
backend/app/Http/Controllers/InvoiceController.php           (C3)
backend/routes/api.php                                       (H3)
backend/database/seeders/UserSeeder.php                      (H4)
backend/.env.example                                         (C4)
```
