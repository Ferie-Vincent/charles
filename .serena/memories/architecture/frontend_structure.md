# Frontend Structure (React 18 + TypeScript + Vite)

## Features (22 modules)
- auth: login, session restore, auth-store (in-memory state)
- projects: CRUD, ProjectDetailPage (tabs: journal, budget, DQE, incidents, photos, accounting)
- daily-logs: DailyLogForm (structured fields, no free text)
- dqe: DQE versions, lines, lots, PDF, duplicate
- accounting: AccountingDashboardPage (360° view, invoice workflow)
- achats: purchase orders, approval workflow, réception BL
- stocks: stock items, movements (in/out/adjustment)
- besoins: demandes de besoins workflow
- ged: document upload/download, types (plan/contrat/pv/rapport/facture/photo/autre)
- suppliers: per-project suppliers
- costs: portfolio costs view
- operations: OperationsDashboardPage (DT/DG piloting)
- dashboard: role-based dashboard (4 role groups)
- map: Leaflet + Font Awesome markers, health score colors
- timeline: Gantt BTP simplifié
- evaluation: portfolio evaluation
- qhse: portfolio QSE
- reporting: portfolio reports
- permissions: DB-backed permissions matrix (direction only)
- users: CRUD (direction only)
- profile: user profile
- settings: app settings

## Key Files
- src/lib/api.ts: axios instance (baseURL=localhost:8000/api, withCredentials, XSRF interceptor, global error event dispatching)
- src/lib/roles.ts: RBAC feature→role group map
- src/lib/permissions-context.tsx: PermissionsProvider
- src/App.tsx: QueryClientProvider > AuthProvider > SessionRestorer > PermissionsProvider > RouterProvider + GlobalErrorToast
- src/styles/index.css: all styles (CSS custom properties, no Tailwind)

## Auth Flow
1. App loads → refreshCsrf() then getMe()
2. If getMe() fails → auto-login as direction@charles.ci (dev shortcut)
3. XSRF-TOKEN cookie read on every request by interceptor
4. Global api-error event on 401/403/419/5xx → toast notification

## Router
Feature-based lazy routes, ProtectedRoute guards by auth state + role
