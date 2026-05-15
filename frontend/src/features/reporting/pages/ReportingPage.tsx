import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  getPortfolioReports,
  type PortfolioReport,
} from '../api/get-portfolio-reports';
import { downloadReport } from '../../../lib/download-report';
import PageHeader from '../../../components/ui/PageHeader';
import { fmtBytes as formatBytes } from '../../../lib/formatters';

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatWeekOf(dateStr: string): string {
  const [year, month, day] = dateStr.split('-');
  return `Semaine du ${day}/${month}/${year}`;
}

function formatCreatedAt(isoStr: string): string {
  const d = new Date(isoStr);
  const dd   = String(d.getDate()).padStart(2, '0');
  const mm   = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const hh   = String(d.getHours()).padStart(2, '0');
  const min  = String(d.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
}

const TYPE_BADGE: Record<string, string> = {
  hebdo:  'badge badge-completed',
  manuel: 'badge badge-draft',
};

const PAGE_SIZE = 20;

type FilterType = 'tous' | 'hebdo' | 'manuel';

// ── Page ─────────────────────────────────────────────────────────────────────

export default function ReportingPage() {
  const [search, setSearch]           = useState('');
  const [typeFilter, setTypeFilter]   = useState<FilterType>('tous');
  const [showAll, setShowAll]         = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['portfolio-reports'],
    queryFn: getPortfolioReports,
  });

  const stats   = data?.stats;
  const reports = data?.reports ?? [];

  const filtered = reports.filter(r => {
    const matchSearch =
      !search ||
      r.project_name.toLowerCase().includes(search.toLowerCase()) ||
      r.filename.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === 'tous' || r.type === typeFilter;
    return matchSearch && matchType;
  });

  const visible    = showAll ? filtered : filtered.slice(0, PAGE_SIZE);
  const hasMore    = filtered.length > PAGE_SIZE && !showAll;

  return (
    <div>
      <PageHeader
        breadcrumb="PORTEFEUILLE"
        title="Rapports générés"
        subtitle="Historique des rapports PDF par chantier"
      />

      {/* ── KPI strip ── */}
      <div className="proj-kpi-row">
        <div className="proj-kpi">
          <div className="proj-kpi__icon proj-kpi__icon--blue">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
              <polyline points="10 9 9 9 8 9"/>
            </svg>
          </div>
          <div className="proj-kpi__body">
            <div className="proj-kpi__value">
              {isLoading ? '…' : (stats?.total_reports ?? 0)}
            </div>
            <div className="proj-kpi__label">Total rapports</div>
          </div>
        </div>

        <div className="proj-kpi">
          <div className="proj-kpi__icon proj-kpi__icon--teal">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          </div>
          <div className="proj-kpi__body">
            <div className="proj-kpi__value">
              {isLoading ? '…' : (stats?.hebdo_count ?? 0)}
            </div>
            <div className="proj-kpi__label">Rapports hebdo</div>
          </div>
        </div>

        <div className="proj-kpi">
          <div className="proj-kpi__icon proj-kpi__icon--orange">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 20h9"/>
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
            </svg>
          </div>
          <div className="proj-kpi__body">
            <div className="proj-kpi__value">
              {isLoading ? '…' : (stats?.manuel_count ?? 0)}
            </div>
            <div className="proj-kpi__label">Rapports manuels</div>
          </div>
        </div>

        <div className="proj-kpi">
          <div className="proj-kpi__icon proj-kpi__icon--green">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          </div>
          <div className="proj-kpi__body">
            <div className="proj-kpi__value">
              {isLoading ? '…' : (stats?.projects_with_reports ?? 0)}
            </div>
            <div className="proj-kpi__label">Chantiers couverts</div>
          </div>
        </div>
      </div>

      {/* ── Table panel ── */}
      <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>

        {/* Toolbar row */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '14px 18px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>

          {/* Search */}
          <div className="acct-search-wrap" style={{ flex: 1, minWidth: 200, maxWidth: 340 }}>
            <svg className="acct-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              className="acct-search-input"
              placeholder="Rechercher par chantier ou fichier…"
              value={search}
              onChange={e => { setSearch(e.target.value); setShowAll(false); }}
            />
            {search && (
              <button
                className="acct-search-clear"
                onClick={() => { setSearch(''); setShowAll(false); }}
                aria-label="Effacer"
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            )}
          </div>

          {/* Filter tabs */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {(['tous', 'hebdo', 'manuel'] as FilterType[]).map(t => {
              const count =
                t === 'tous' ? reports.length :
                reports.filter(r => r.type === t).length;
              const active = typeFilter === t;
              return (
                <button
                  key={t}
                  className={`bud-tab${active ? ' bud-tab--active' : ''}`}
                  onClick={() => { setTypeFilter(t); setShowAll(false); }}
                >
                  {t === 'tous' ? 'Tous' : t.charAt(0).toUpperCase() + t.slice(1)}
                  <span style={{ marginLeft: 5, fontSize: 10, fontWeight: 700, background: active ? 'rgba(255,255,255,0.2)' : 'var(--border)', color: active ? 'inherit' : 'var(--text-muted)', borderRadius: 4, padding: '1px 5px' }}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Table */}
        {isError && (
          <p style={{ padding: 24, color: 'var(--text-muted)' }}>
            <span className="form-error">Erreur de chargement des rapports.</span>
          </p>
        )}

        {!isError && (
          <table className="data-table">
            <thead>
              <tr>
                <th>Chantier</th>
                <th>Rapport</th>
                <th>Semaine</th>
                <th>Type</th>
                <th style={{ textAlign: 'right' }}>Taille</th>
                <th>Date de génération</th>
                <th style={{ textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <td key={j}><span style={{ display: 'block', height: 14, background: 'var(--border)', borderRadius: 4, opacity: 0.5 }} /></td>
                  ))}
                </tr>
              ))}

              {!isLoading && filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="acct-empty">
                    {search || typeFilter !== 'tous'
                      ? 'Aucun rapport ne correspond à votre recherche.'
                      : 'Aucun rapport disponible pour ce portefeuille.'}
                  </td>
                </tr>
              )}

              {!isLoading && visible.map((r: PortfolioReport) => (
                <tr key={r.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, background: 'var(--accent-subtle)', color: 'var(--accent)', borderRadius: 4, padding: '2px 6px', flexShrink: 0 }}>{r.project_code}</span>
                      <span style={{ fontWeight: 600, color: 'var(--text-body)' }}>{r.project_name}</span>
                    </div>
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.filename}
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                    {formatWeekOf(r.week_of)}
                  </td>
                  <td>
                    <span className={TYPE_BADGE[r.type] ?? 'badge badge-draft'}>
                      {r.type === 'hebdo' ? 'Hebdo' : 'Manuel'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                    {formatBytes(r.size_bytes)}
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                    {formatCreatedAt(r.created_at)}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button
                      className="btn btn--sm btn--secondary"
                      onClick={() => downloadReport(r.project_id, r.id, r.filename)}
                    >
                      ↓ PDF
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {hasMore && (
        <div style={{ textAlign: 'center', paddingTop: 16 }}>
          <button className="btn btn--secondary" onClick={() => setShowAll(true)}>
            Afficher {filtered.length - PAGE_SIZE} rapports supplémentaires
          </button>
        </div>
      )}
    </div>
  );
}
