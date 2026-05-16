# Code Conventions

## Backend (PHP/Laravel)
- Laravel Policies for authorization — `$this->authorize()` in controllers
- Company-scoped queries mandatory: filter by `request->user()->company_id`
- Roles seeded via RoleSeeder (not migrations)
- No comments unless WHY is non-obvious
- CORS: allow both localhost:5173 and localhost:5174

## Frontend (TypeScript/React)
Feature-based folder layout:
```
src/features/<feature>/
  api/        — TanStack Query hooks + axios calls
  components/ — feature components
  pages/      — page-level components
  types.ts    — TypeScript types
```

Shared:
- `src/lib/api.ts` — single Axios instance (withCredentials: true)
- `src/lib/roles.ts` — RBAC feature→role group map
- `src/styles/index.css` — all styles (CSS custom properties)
- No Tailwind — plain CSS vars only

## Naming
- PHP: PascalCase classes, snake_case methods/columns
- TS: camelCase functions, PascalCase components/types
