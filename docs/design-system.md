# Design System — Chantier Platform

**Reference page:** `frontend/src/features/achats/pages/AchatsPage.tsx`  
**Reference page:** `frontend/src/features/stocks/pages/StocksPage.tsx`  
**All styles live in:** `frontend/src/styles/index.css`

---

## Rule: Every page must use these 5 primitives

| Primitive | Class(es) | Purpose |
|-----------|-----------|---------|
| Page header | `<PageHeader>` component | Title + subtitle + CTA button |
| KPI strip | `proj-kpi-row` > `proj-kpi` | 3–5 metric cards below header |
| Filter toolbar | `bud-tab` / `bud-tab--active` | Status/category filter tabs |
| Search | `acct-search-wrap` + `acct-search-input` | Text search input |
| Table | `data-table` inside `bg-panel` card | Main data table |

---

## 1. Page Header

```tsx
import PageHeader from '../../../components/ui/PageHeader';

<PageHeader
  title="Nom de la page"
  subtitle="Description courte de la section"
  action={
    <button className="btn-primary" onClick={handleCreate}>
      + Nouveau
    </button>
  }
/>
```

**Props:** `title` (required) · `subtitle` · `action` (ReactNode) · `breadcrumb` · `syncLabel`  
**Note:** prop is `action` (singular), NOT `actions`.

---

## 2. KPI Cards

```tsx
<div className="proj-kpi-row">
  <div className="proj-kpi">
    <div className="proj-kpi__icon proj-kpi__icon--orange">
      <svg width="15" height="15" ...>{/* icon */}</svg>
    </div>
    <div className="proj-kpi__body">
      <div className="proj-kpi__value">42</div>
      <div className="proj-kpi__label">En attente</div>
    </div>
  </div>
  {/* repeat for each KPI */}
</div>
```

**Icon color variants** (gradient backgrounds, white icon):

| Class | Color | Use for |
|-------|-------|---------|
| `proj-kpi__icon--blue` | Blue gradient | Neutral count, total |
| `proj-kpi__icon--orange` | Orange gradient | Pending, warning |
| `proj-kpi__icon--green` | Green gradient | OK, approved, success |
| `proj-kpi__icon--teal` | Teal gradient | Received, completed |
| `proj-kpi__icon--red` | Red gradient | Critical, error, rupture |

**Value color overrides** (add inline style to `proj-kpi__value` only when count > 0 is meaningful):
```tsx
<div className="proj-kpi__value" style={{ color: count > 0 ? '#ef4444' : undefined }}>
```

**Recommended KPI count:** 4 cards. Do not exceed 5.

---

## 3. Alert Banner (optional, conditional)

Show only when there is something actionable (pending approvals, low stock, etc.):

```tsx
{pendingCount > 0 && (
  <div className="acct-pending-banner">
    <svg ...>{/* warning icon */}</svg>
    <strong>{pendingCount} éléments en attente</strong>
    <span>— description</span>
  </div>
)}
```

Place **after** KPI row, **before** table panel.

---

## 4. Table Panel (filter bar + table)

Wrap the entire table section in a single `bg-panel` card:

```tsx
<div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>

  {/* Toolbar row */}
  <div style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '14px 18px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>

    {/* Search */}
    <div className="acct-search-wrap" style={{ flex: 1, minWidth: 200, maxWidth: 340 }}>
      <svg className="acct-search-icon" ...>{/* search icon */}</svg>
      <input
        type="text"
        className="acct-search-input"
        placeholder="Rechercher…"
        value={search}
        onChange={e => setSearch(e.target.value)}
      />
      {search && (
        <button className="acct-search-clear" onClick={() => setSearch('')}>
          <svg ...>{/* × icon */}</svg>
        </button>
      )}
    </div>

    {/* Filter tabs */}
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      <button className={`bud-tab ${!filter ? 'bud-tab--active' : ''}`} onClick={() => setFilter('')}>
        Tous <span className="dqe-filter-count">{total}</span>
      </button>
      {STATUSES.map(s => (
        <button
          key={s.key}
          className={`bud-tab ${filter === s.key ? 'bud-tab--active' : ''}`}
          onClick={() => setFilter(filter === s.key ? '' : s.key)}
        >
          {s.label} <span className="dqe-filter-count">{counts[s.key]}</span>
        </button>
      ))}
    </div>
  </div>

  {/* Table */}
  {loading ? (
    <p style={{ padding: 24, color: 'var(--text-muted)' }}>Chargement…</p>
  ) : (
    <table className="data-table">
      <thead>
        <tr>
          <th>Colonne</th>
          <th style={{ textAlign: 'right' }}>Montant</th>
          <th>Statut</th>
          <th></th> {/* actions column — no header text */}
        </tr>
      </thead>
      <tbody>
        {filtered.length === 0 && (
          <tr><td colSpan={4} className="acct-empty">Aucun élément trouvé</td></tr>
        )}
        {filtered.map(item => (
          <tr key={item.id}>
            <td>
              <span style={{ fontWeight: 600, color: 'var(--text-body)' }}>{item.name}</span>
              <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>{item.sub}</p>
            </td>
            <td style={{ textAlign: 'right', fontWeight: 700 }}>{fmt(item.amount)}</td>
            <td><span className={`badge badge-${item.status}`}>{LABEL[item.status]}</span></td>
            <td>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn-icon btn-icon--edit" onClick={() => handleEdit(item)}>
                  <svg .../>
                </button>
                <button className="btn-icon btn-icon--delete" onClick={() => handleDelete(item.id)}>
                  <svg .../>
                </button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )}
</div>
```

---

## 5. Badges

Use `badge` + modifier class for status indicators:

| Class | Color | Use for |
|-------|-------|---------|
| `badge-active` | Green | Validé, actif, approuvé |
| `badge-draft` | Gray | Brouillon, neutre |
| `badge-completed` | Blue | Terminé |
| `badge-archived` | Gray | Archivé |
| `badge-overdue` | Red | En retard |
| `badge-urgent` | Orange | Urgent |

For **dynamic colors** (data-driven, not semantic):
```tsx
<span className="badge" style={{ background: `${color}12`, color, borderColor: `${color}35` }}>
  Catégorie
</span>
```

---

## 6. Action Buttons (row level)

```tsx
{/* Edit */}
<button className="btn-icon btn-icon--edit" onClick={() => handleEdit(item)}>
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
</button>

{/* Delete */}
<button className="btn-icon btn-icon--delete" onClick={() => handleDelete(item.id)}>
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
  </svg>
</button>
```

---

## 7. Modals

Use `mr-modal-overlay` + `mr-modal` pattern. **Do not redesign modals** — they already follow the standard:

```tsx
<div className="mr-modal-overlay" onClick={() => setModal(null)}>
  <div className="mr-modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
    <div className="mr-modal__head">
      <h2 className="mr-modal__title">Titre modal</h2>
      <button className="mr-modal__close" onClick={() => setModal(null)}>✕</button>
    </div>
    <div className="mr-modal__body">
      {/* form fields */}
    </div>
    <div className="mr-modal__actions">
      <button className="btn btn--secondary" onClick={() => setModal(null)}>Annuler</button>
      <button className="btn btn--primary" onClick={handleSave} disabled={saving}>
        {saving ? 'Enregistrement…' : 'Enregistrer'}
      </button>
    </div>
  </div>
</div>
```

---

## 8. Full Page Wrapper

```tsx
return (
  <div className="page-container">
    <PageHeader ... />
    <div className="proj-kpi-row">...</div>
    {/* optional: acct-pending-banner */}
    <div style={{ background: 'var(--bg-panel)', ... }}>
      {/* toolbar + data-table */}
    </div>
    {/* modals */}
  </div>
);
```

**Note:** `page-container` is not a defined CSS class (the AppShell already handles padding). Any plain `<div>` wrapper works. Using `page-container` is fine as a semantic label even without explicit styles.

---

## 9. Design Audit — Page Status

| Route | File | PageHeader | proj-kpi-row | Status |
|-------|------|-----------|--------------|--------|
| `/achats` | AchatsPage.tsx | ✅ | ✅ | **Done** |
| `/stocks` | StocksPage.tsx | ✅ | ✅ | **Done** |
| `/suppliers` | SuppliersPage.tsx | ✅ | ✅ | **Done** |
| `/accounting` | AccountingDashboardPage.tsx | ✅ | ✅ | **Done** |
| `/dqe` | DqePage.tsx | ✅ | ✅ | **Done** |
| `/projects/*/dqe/*` | DqeEditorPage.tsx | ✅ | ✅ | **Done** |
| `/costs` | CostsPage.tsx | ✅ | ❌ | **Needs KPIs** |
| `/ged` | GedPage.tsx | ✅ | ✅ | **Done** |
| `/qhse` | QhsePage.tsx | ✅ | ❌ | **Needs KPIs** |
| `/reporting` | ReportingPage.tsx | ✅ | ❌ | **Needs KPIs** |
| `/evaluation` | EvaluationPage.tsx | ✅ | ❌ | **Needs KPIs** |
| `/operations` | OperationsDashboardPage.tsx | ✅ | ❌ | **Needs KPIs** |
| `/users` | UsersPage.tsx | ✅ | ❌ | **Needs KPIs** |
| `/permissions` | PermissionsPage.tsx | ✅ | ❌ | **Needs KPIs** |
| `/projects` | ProjectsPage.tsx | ✅ | ❌ | **Reference — card layout, not table** |
| `/projects/*` | ProjectDetailPage.tsx | ❌ | ✅ | **Needs PageHeader** |
| `/projects/*/journal` | JournalPage.tsx | ✅ | ❌ | **Needs KPIs** |
| `/map` | MapPage.tsx | ❌ | ❌ | **Needs full redesign** |
| `/timeline` | TimelinePage.tsx | ❌ | ❌ | **Needs full redesign** |
| `/dashboard` | DashboardPage.tsx | ✅ | ❌ | **Dashboard — special layout** |
| `/login` | LoginPage.tsx | — | — | **Skip — auth page** |

---

## Agent Instructions

When assigned a page to redesign:

1. **Read the target file** fully before touching it.
2. **Read `AchatsPage.tsx`** as the reference for correct class names and structure.
3. Apply the 5 primitives: `PageHeader` · `proj-kpi-row` · filter toolbar · search · `data-table`.
4. **Do not touch modals** — only the page-level layout above modals changes.
5. Create a feature branch: `git checkout -b feat/<page-name>-redesign`
6. Run `npx tsc --noEmit` — zero errors required.
7. Commit, then merge to master and delete branch.
8. Update the table above: mark the page as **Done**.

**What NOT to change:**
- Modal markup and classes (`mr-modal-*`)
- Business logic, state, handlers
- Form fields inside modals
- API calls
