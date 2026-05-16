# Tech Stack

| Layer | Tech |
|---|---|
| Backend | Laravel 12, PHP 8.4+, MySQL 8+ (MAMP port 3306) |
| Auth | Laravel Sanctum (cookie-based session, withCredentials: true) |
| Testing BE | Pest + PHPUnit |
| Frontend | React 18+, TypeScript, Vite |
| Routing/Data | React Router, TanStack Query, Axios |
| Testing FE | Vitest + React Testing Library |
| Styles | Custom CSS vars (no Tailwind) — `src/styles/index.css` |
| Charts | Recharts |
| File Storage | Storage::disk('public') dev — MinIO prod (FILESYSTEM_DISK=s3) |

## Databases
- Dev: `chantier_platform` (MySQL, MAMP)
- Test: `chantier_platform_test` (MySQL, MAMP) — NO SQLite fallback

## PHP Binary
Use MAMP PHP 8.4: `/Applications/MAMP/bin/php/php8.4.17/bin/php`
(Homebrew PHP broken: libnetsnmp.40.dylib missing)
