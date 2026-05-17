# Chantier Platform

Plateforme de gestion de chantiers BTP multi-projets — conçue pour les entreprises de construction en **Côte d'Ivoire**.

Remplace les workflows Excel par une plateforme multi-tenant couvrant : portefeuille projets, DQE, suivi d'exécution terrain, pilotage des coûts, QSE et reporting direction.

---

## Démarrage rapide

```bash
# Backend
cd backend && composer install && cp .env.example .env
php artisan key:generate && php artisan migrate:fresh --seed
php artisan serve          # → http://localhost:8000

# Frontend (autre terminal)
cd frontend && npm install
npm run dev                # → http://localhost:5173 ou 5174
```

Compte direction par défaut après seed : `direction@example.com` / `password`

---

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Backend | Laravel 12, PHP 8.3+, MySQL 8+ |
| Auth | Laravel Sanctum (cookie session) |
| Frontend | React 18+, TypeScript, Vite |
| Data fetching | TanStack Query v5 |
| Routing | React Router v6 |
| Styles | CSS custom properties — pas de Tailwind |
| Charts | Recharts |
| Tests backend | Pest + PHPUnit |
| Tests frontend | Vitest + React Testing Library |
| Stockage fichiers | `Storage::disk('public')` en dev, MinIO/S3 en prod |
| IA | Mistral AI (prioritaire), Groq, Anthropic (fallbacks) |
| Alertes | Twilio WhatsApp |

---

## Prérequis

- PHP 8.3+ avec extensions : `pdo_mysql`, `mbstring`, `openssl`, `gd`
- Composer 2+
- Node.js 20+ / npm 10+
- MySQL 8+ (MAMP recommandé sur macOS)
- Deux bases de données MySQL : `chantier_platform` et `chantier_platform_test`

---

## Installation détaillée

### 1. Base de données

```sql
CREATE DATABASE chantier_platform CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE chantier_platform_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 2. Backend

```bash
cd backend
composer install
cp .env.example .env
```

Éditer `.env` :

```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=chantier_platform
DB_USERNAME=root
DB_PASSWORD=root        # mot de passe MAMP par défaut

# Obligatoire pour les migrations
SESSION_DRIVER=database
```

```bash
php artisan key:generate
php artisan migrate:fresh --seed
php artisan serve
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Vite utilise le port **5174** (ou 5173 si libre). Les deux sont autorisés en CORS côté Laravel.

### 4. Symlink stockage fichiers (dev)

```bash
cd backend && php artisan storage:link
```

---

## Variables d'environnement

### Backend (`backend/.env`)

```env
# App
APP_NAME="Chantier Platform"
APP_ENV=local
APP_DEBUG=false           # ⚠️ mettre false même en dev (sécurité)
APP_URL=http://localhost:8000

# Base de données
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=chantier_platform
DB_USERNAME=root
DB_PASSWORD=

# Sanctum — domaines autorisés (séparés par virgule)
SANCTUM_STATEFUL_DOMAINS=localhost:5173,localhost:5174
SESSION_DRIVER=database
SESSION_DOMAIN=localhost

# Stockage (dev = public, prod = s3/MinIO)
FILESYSTEM_DISK=public
# AWS_ACCESS_KEY_ID=
# AWS_SECRET_ACCESS_KEY=
# AWS_DEFAULT_REGION=
# AWS_BUCKET=
# AWS_ENDPOINT=http://localhost:9000   # MinIO

# IA — au moins une clé requise pour les fonctions IA
MISTRAL_API_KEY=          # prioritaire
GROQ_API_KEY=             # fallback
ANTHROPIC_API_KEY=        # fallback + vision CR réunion

# WhatsApp (alertes)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
```

### Frontend (`frontend/.env.local`)

```env
VITE_API_URL=http://localhost:8000
```

---

## Tests

### Backend

```bash
cd backend
php artisan test                                           # tous les tests
php artisan test tests/Feature/Auth/LoginTest.php        # un fichier
php artisan test --filter LoginTest                      # par nom
```

La base de test (`chantier_platform_test`) doit exister. Premier lancement :

```bash
php artisan migrate:fresh --seed --env=testing --force
```

> Sur macOS avec MAMP : utiliser `/Applications/MAMP/bin/php/php8.4.17/bin/php artisan test` si PHP système est cassé.

### Frontend

```bash
cd frontend
npm run test          # watch mode
npm run test -- --run # une seule passe (CI)
```

---

## Structure du projet

```
charles/
├── backend/                    Laravel 12 API
│   ├── app/
│   │   ├── Http/Controllers/   Un controller par domaine fonctionnel
│   │   ├── Models/             Eloquent — scopes company_id partout
│   │   ├── Policies/           Autorisation RBAC (ProjectPolicy, etc.)
│   │   ├── Services/
│   │   │   ├── GroqService.php     Client IA multi-provider
│   │   │   └── PdfService.php      Génération PDF (DomPDF)
│   │   └── Console/Commands/   Tâches planifiées (snapshots IA, rapport hebdo)
│   ├── database/
│   │   ├── migrations/         Toutes les migrations en ordre chronologique
│   │   └── seeders/            RoleSeeder, CompanySeeder, ProjectSeeder…
│   └── routes/api.php          Toutes les routes API
│
├── frontend/                   React SPA
│   └── src/
│       ├── features/           Organisation par domaine fonctionnel
│       │   ├── auth/
│       │   ├── projects/
│       │   ├── daily-logs/
│       │   ├── dqe/
│       │   ├── accounting/
│       │   ├── achats/
│       │   ├── stocks/
│       │   ├── ged/
│       │   ├── ai/
│       │   └── …
│       ├── components/
│       │   ├── layout/         AppShell, Sidebar, Topbar
│       │   └── ui/             Card, PageHeader, composants partagés
│       ├── lib/
│       │   ├── api.ts          Instance Axios unique (baseURL + withCredentials)
│       │   ├── roles.ts        Map feature → groupes de rôles autorisés
│       │   └── query-client.ts TanStack Query client
│       └── styles/index.css    Tout le CSS — custom properties + classes composants
│
└── docs/
    ├── logique-metier.md       ⭐ Source de vérité domaine BTP — lire en premier
    ├── design-system.md        Tokens CSS, typographie, couleurs
    └── ONBOARDING.md           Ce guide développeur
```

---

## Architecture clé

### Multi-tenant par `company_id`

**Chaque requête authentifiée doit filtrer par `company_id`.**

```php
// ✅ Correct
$projects = Project::where('company_id', $request->user()->company_id)->get();

// ❌ Fuite de données inter-entreprises
$projects = Project::all();
```

### Auth Sanctum cookie

- Session cookie, pas de token Bearer
- Frontend : `withCredentials: true` sur toutes les requêtes Axios (configuré dans `lib/api.ts`)
- Laravel : `SESSION_DOMAIN=localhost` dans `.env`

### Autorisation par Policy

```php
// Dans un controller
$this->authorize('update', $project);  // → ProjectPolicy::update()
```

Les policies sont dans `backend/app/Policies/`.

### Rôles (7 rôles seedés)

| Slug | Accès |
|------|-------|
| `direction` | Tout — admin général |
| `directeur-technique` | Projets + opérations + validation BDC/DQE |
| `conducteur-travaux` | Projets assignés + journaux + achats |
| `chef-chantier` | Terrain uniquement (journaux, incidents) |
| `metreur-economiste` | DQE + coûts |
| `comptable` | Comptabilité + factures |
| `lecture-seule` | Lecture uniquement |

La map `feature → groupes` est dans `frontend/src/lib/roles.ts`.

---

## Règles métier inviolables

> Lire `docs/logique-metier.md` en entier avant de toucher à la logique financière ou aux workflows.

Les points les plus critiques :

- **1 journal/jour/chantier** — contrainte unique DB `(project_id, log_date)`
- **Montant DQE calculé**, jamais saisi — `montant_ht = quantite × prix_unitaire`
- **Workflows irréversibles** — situation : `soumise → validée → payée` (pas de retour en arrière)
- **BDC** : `pending → approved → received` (pas de suppression une fois approuvé)
- **TVA 18%** Côte d'Ivoire, devise XOF/FCFA
- **Retenue de garantie 5%** sur les situations de travaux

---

## Fonctionnalités IA

Nécessite au moins une clé API (`MISTRAL_API_KEY` prioritaire).

| Fonction | Endpoint | Description |
|----------|----------|-------------|
| Briefing matinal | `GET /api/ai/briefing` | Synthèse quotidienne basée sur snapshots projets |
| Assistant chantier | `POST /api/ai/query` | RAG sur données structurées temps réel |
| Situation de travaux | `POST /api/projects/{id}/situation-travaux` | Génération depuis DQE + journaux |
| CR Réunion | `POST /api/projects/{id}/meetings` | Analyse et structuration depuis notes |
| Vision IA | `POST /api/ai/vision` | Analyse photos de chantier (Mistral Pixtral) |

Les snapshots IA sont pré-calculés quotidiennement à 01h00 (Abidjan) via :

```bash
php artisan ai:build-snapshots
```

---

## Git workflow

```
master          ← branche principale, toujours déployable
main            ← miroir de master (GitHub default branch)
feat/<nom>      ← nouvelle fonctionnalité
fix/<nom>       ← correctif
docs/<nom>      ← documentation uniquement
```

Convention commits :

```
feat(module): description courte
fix(module): ce qui est corrigé
docs: mise à jour documentation
chore: tâche technique sans impact fonctionnel
```

Toujours créer une branche, merger dans master, puis pousser.

---

## Pièges courants

| Problème | Cause | Solution |
|----------|-------|----------|
| 401 sur toutes les requêtes | `withCredentials` manquant | Vérifié dans `lib/api.ts` |
| CORS error | Port Vite différent | Ajouter port dans `config/cors.php` et `.env` |
| "No application encryption key" | `.env` non généré | `php artisan key:generate` |
| Tests échouent sur DB | Base test inexistante | `php artisan migrate:fresh --seed --env=testing` |
| `storage/app/public` vide | Symlink manquant | `php artisan storage:link` |
| IA retourne "données insuffisantes" | Snapshots non générés | `php artisan ai:build-snapshots` |
| Montants erronés en comptabilité | `company_id` scope manquant | Vérifier tous les `where('company_id', ...)` |

---

## Liens utiles

- `docs/logique-metier.md` — Domaine BTP CI, règles métier, workflows
- `docs/design-system.md` — Tokens CSS, palette couleurs, typographie
- `CLAUDE.md` — Instructions pour l'assistant IA (conventions projet)
