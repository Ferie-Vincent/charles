# Guide d'onboarding développeur

> Pour la première semaine. Complète le `README.md` avec les détails d'implémentation.

---

## Semaine 1 — dans cet ordre

1. Lire `docs/logique-metier.md` (645 lignes — indispensable pour le domaine BTP CI)
2. Installer et faire tourner la plateforme (voir README)
3. Explorer le seed : `php artisan migrate:fresh --seed` puis se connecter avec chaque rôle
4. Lire `frontend/src/lib/roles.ts` — comprendre le RBAC
5. Parcourir une feature de bout en bout : `features/projects/` (modèle le plus complet)

---

## Modèle de données principal

```
companies
  └── users (company_id, role_id)
  └── projects (company_id)
        ├── project_members (user_id, role)
        ├── daily_logs (1 par jour max — contrainte unique)
        │     └── materials_received (JSON)
        ├── incidents (sévérité mineur/majeur/critique)
        ├── budget_entries (type: previsionnel/engagement/paiement)
        ├── dqe_versions
        │     └── dqe_lines (montant calculé = quantite × prix_unitaire)
        ├── situation_travaux
        ├── invoices
        ├── suppliers (par projet)
        ├── purchase_orders (BDC)
        ├── ged_documents
        └── project_reports
  └── stock_items (company_id)
        └── stock_movements
  └── ged_documents (project_id nullable = doc global)
```

### Règle d'or : `company_id` partout

Chaque `Model::query()` dans un controller doit filtrer par `company_id` de l'utilisateur authentifié. Ne jamais exposer de données d'une autre entreprise.

```php
// Pattern standard dans tous les controllers
$companyId = $request->user()->company_id;
$items = MyModel::where('company_id', $companyId)->get();
```

---

## RBAC — comment ça marche

### Backend

Les rôles sont seedés (pas créés en migration) via `RoleSeeder`. 7 slugs fixes :
`direction`, `directeur-technique`, `conducteur-travaux`, `chef-chantier`, `metreur-economiste`, `comptable`, `lecture-seule`

Autorisation via Policies Laravel :

```php
// ProjectPolicy.php
public function update(User $user, Project $project): bool
{
    return in_array($user->role->slug, ['direction', 'directeur-technique', 'conducteur-travaux'])
        && $project->company_id === $user->company_id;
}
```

### Frontend

`frontend/src/lib/roles.ts` mappe chaque route/feature vers les groupes autorisés :

```typescript
export const ROLE_ACCESS: Record<string, string[]> = {
  '/users': ['direction'],
  '/portfolio': ['direction', 'dt'],
  '/operations': ['direction', 'dt'],
  // ...
};
```

Les groups sont : `direction`, `dt` (directeur-technique), `terrain`, `comptable`, `lecture`.
La fonction `getRoleGroup(roleName)` convertit le slug DB vers le groupe frontend.

---

## Comment ajouter une feature

### 1. Migration + Modèle

```bash
php artisan make:migration create_my_feature_table
php artisan make:model MyFeature
```

Toujours inclure `company_id` si la table appartient à une entreprise.

### 2. Policy

```bash
php artisan make:policy MyFeaturePolicy --model=MyFeature
```

Enregistrer dans `AuthServiceProvider` (ou auto-discovery Laravel 12).

### 3. Controller

```bash
php artisan make:controller MyFeatureController
```

Pattern standard :

```php
public function index(Request $request)
{
    $this->authorize('viewAny', MyFeature::class);
    return MyFeature::where('company_id', $request->user()->company_id)
        ->orderByDesc('created_at')
        ->get();
}
```

### 4. Route

Dans `routes/api.php`, dans le groupe `auth` :

```php
Route::apiResource('my-features', MyFeatureController::class);
```

### 5. Frontend — feature folder

```
src/features/my-feature/
  api/           fonctions fetch (useQuery/useMutation)
  components/    composants spécifiques
  pages/         pages React Router
  types.ts       types TypeScript
```

Toujours utiliser l'instance `api` de `lib/api.ts`, jamais `axios` directement.

### 6. Tests

```bash
php artisan make:test MyFeatureTest
```

Tests à écrire au minimum :
- Requiert authentification (401 sans auth)
- Isolation company (403 cross-company)
- CRUD de base (201, 200, 204)

---

## Workflows irréversibles — NE PAS CONTOURNER

Ces transitions sont volontairement à sens unique :

```
Situation de travaux : soumise → validée → payée
BDC (Purchase Order) : pending → approved → received
Facture              : soumise → validée → payée
DQE Version          : draft → validated → archived
```

Implémenter ces gardes côté backend ET frontend. Un état `payée` ne peut jamais revenir à `soumise`.

---

## CSS — design system

Tout le CSS est dans `frontend/src/styles/index.css`. Pas de Tailwind.

Le système utilise des custom properties CSS :

```css
var(--primary)        /* #2F60B0 — bleu Helaman */
var(--accent)         /* #78CDD4 — turquoise */
var(--text-primary)   /* titre */
var(--text-body)      /* corps de texte */
var(--text-muted)     /* secondaire */
var(--bg-card)        /* fond carte */
var(--border)         /* bordure */
var(--radius-lg)      /* border-radius large */
```

Ne jamais ajouter de styles inline complexes. Créer une classe CSS dans `index.css`.

---

## TanStack Query — conventions

```typescript
// Pattern standard pour une liste
const { data, isLoading } = useQuery({
  queryKey: ['projects'],           // clé unique — invalider avec queryClient.invalidateQueries
  queryFn: getProjects,
  staleTime: 60_000,                // 60s cache
});

// Pattern standard pour une mutation
const mutation = useMutation({
  mutationFn: (data) => api.post('/projects', data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['projects'] });
    showToast('Projet créé');
  },
});
```

---

## Fonctionnalités IA

### Architecture

`GroqService.php` gère 3 providers avec fallback automatique :
1. **Mistral** (prioritaire) — `mistral-small-latest`
2. **Groq** — `llama-3.1-8b-instant`
3. **Anthropic** — `claude-haiku-4-5-20251001`

Si une entreprise configure sa propre clé via les paramètres, elle prime sur la clé `.env`.

### Snapshots IA

Le briefing matinal et l'assistant RAG lisent des `project_snapshots` pré-calculés :

```bash
php artisan ai:build-snapshots   # exécuté automatiquement à 01h00 Abidjan
```

Sans snapshot, le briefing retourne "données insuffisantes".

### FAB flottant

`AiFab` est monté dans `AppShell` — visible sur toutes les pages pour les rôles `direction` et `dt`. Il ouvre le briefing et l'assistant en modal.

---

## Planificateur de tâches

Configurer un cron sur le serveur :

```bash
* * * * * cd /path/to/backend && php artisan schedule:run >> /dev/null 2>&1
```

Tâches planifiées (`app/Console/Kernel.php`) :
- **Lundi 07h00** — Rapport hebdo PDF auto-généré
- **01h00 quotidien** — `ai:build-snapshots`
- **Alertes WhatsApp** — déclenchées sur événements métier

---

## Production (Docker / MinIO)

`docker-compose.yml` est prêt à l'emploi pour MinIO (stockage fichiers S3-compatible) :

```bash
docker-compose up -d   # démarre MinIO
```

Changer dans `.env` :

```env
FILESYSTEM_DISK=s3
AWS_ACCESS_KEY_ID=minio
AWS_SECRET_ACCESS_KEY=minio123
AWS_BUCKET=chantier
AWS_ENDPOINT=http://localhost:9000
AWS_USE_PATH_STYLE_ENDPOINT=true
```

---

## Contacts et ressources

- Spec produit : `docs/superpowers/specs/2026-04-28-chantier-dqe-webapp-design.md`
- Logique métier BTP : `docs/logique-metier.md`
- Design system : `docs/design-system.md`
- Audit sécurité : `docs/security-audit-2026-05-02.md`
