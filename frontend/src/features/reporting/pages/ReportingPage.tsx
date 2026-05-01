import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  getPortfolioReports,
  type PortfolioReport,
  type PortfolioReportStats,
} from '../api/get-portfolio-reports';
import { downloadReport } from '../../../lib/download-report';
import PageHeader from '../../../components/ui/PageHeader';

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes >= 1_000_000) {
    return `${(bytes / 1_000_000).toFixed(1).replace('.', ',')} Mo`;
  }
  return `${Math.round(bytes / 1_000)} Ko`;
}

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

// ── Sub-components ────────────────────────────────────────────────────────────

function KpiBar({ stats }: { stats: PortfolioReportStats }) {
  return (
    <div className="rp-kpi-bar">
      <div className="rp-kpi-card">
        <div className="rp-kpi-value">{stats.total_reports}</div>
        <div className="rp-kpi-label">Total rapports</div>
      </div>
      <div className="rp-kpi-card rp-kpi-card--info">
        <div className="rp-kpi-value">{stats.hebdo_count}</div>
        <div className="rp-kpi-label">Rapports hebdo</div>
      </div>
      <div className="rp-kpi-card rp-kpi-card--purple">
        <div className="rp-kpi-value">{stats.manuel_count}</div>
        <div className="rp-kpi-label">Rapports manuels</div>
      </div>
      <div className="rp-kpi-card rp-kpi-card--success">
        <div className="rp-kpi-value">{stats.projects_with_reports}</div>
        <div className="rp-kpi-label">Chantiers couverts</div>
      </div>
    </div>
  );
}

function KpiBarSkeleton() {
  return (
    <div className="rp-kpi-bar">
      {[0, 1, 2, 3].map(i => (
        <div key={i} className="rp-kpi-card">
          <div className="rp-skeleton rp-skeleton--value" />
          <div className="rp-skeleton rp-skeleton--label" />
        </div>
      ))}
    </div>
  );
}

type FilterType = 'tous' | 'hebdo' | 'manuel';

function FilterBar({
  search,
  onSearch,
  typeFilter,
  onTypeFilter,
}: {
  search: string;
  onSearch: (v: string) => void;
  typeFilter: FilterType;
  onTypeFilter: (v: FilterType) => void;
}) {
  return (
    <div className="rp-filter-bar">
      <div className="rp-search-wrap">
        <svg className="rp-search-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.8}>
          <circle cx="8.5" cy="8.5" r="5.5" />
          <path d="M15 15l-3.5-3.5" strokeLinecap="round" />
        </svg>
        <input
          className="rp-search-input"
          type="text"
          placeholder="Rechercher par chantier ou fichier…"
          value={search}
          onChange={e => onSearch(e.target.value)}
        />
        {search && (
          <button className="rp-search-clear" onClick={() => onSearch('')} aria-label="Effacer">
            ✕
          </button>
        )}
      </div>
      <div className="rp-type-tabs">
        {(['tous', 'hebdo', 'manuel'] as FilterType[]).map(t => (
          <button
            key={t}
            className={`rp-type-tab${typeFilter === t ? ' rp-type-tab--active' : ''}`}
            onClick={() => onTypeFilter(t)}
          >
            {t === 'tous' ? 'Tous' : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>
    </div>
  );
}

function TypeBadge({ type }: { type: 'hebdo' | 'manuel' }) {
  return (
    <span className={`rp-type-badge rp-type-badge--${type}`}>
      {type === 'hebdo' ? 'Hebdo' : 'Manuel'}
    </span>
  );
}

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <tr key={i} className="rp-tr rp-tr--skeleton">
          {Array.from({ length: 7 }).map((_, j) => (
            <td key={j} className="rp-td">
              <span className="rp-skeleton rp-skeleton--cell" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

const PAGE_SIZE = 20;

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

      {isLoading && <KpiBarSkeleton />}
      {!isLoading && stats && <KpiBar stats={stats} />}

      <FilterBar
        search={search}
        onSearch={v => { setSearch(v); setShowAll(false); }}
        typeFilter={typeFilter}
        onTypeFilter={v => { setTypeFilter(v); setShowAll(false); }}
      />

      <div className="rp-table-wrap">
        {isError && (
          <div className="rp-empty">
            <p className="form-error">Erreur de chargement des rapports.</p>
          </div>
        )}

        {!isError && (
          <table className="rp-table">
            <thead>
              <tr>
                <th className="rp-th">Chantier</th>
                <th className="rp-th">Rapport</th>
                <th className="rp-th">Semaine</th>
                <th className="rp-th">Type</th>
                <th className="rp-th rp-th--right">Taille</th>
                <th className="rp-th">Date de génération</th>
                <th className="rp-th rp-th--center">Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <SkeletonRows />}

              {!isLoading && filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="rp-empty-cell">
                    {search || typeFilter !== 'tous'
                      ? 'Aucun rapport ne correspond à votre recherche.'
                      : 'Aucun rapport disponible pour ce portefeuille.'}
                  </td>
                </tr>
              )}

              {!isLoading && visible.map((r: PortfolioReport) => (
                <tr key={r.id} className="rp-tr">
                  <td className="rp-td">
                    <div className="rp-project-cell">
                      <span className="rp-code-badge">{r.project_code}</span>
                      <span className="rp-project-name">{r.project_name}</span>
                    </div>
                  </td>
                  <td className="rp-td">
                    <span className="rp-filename">{r.filename}</span>
                  </td>
                  <td className="rp-td rp-td--muted">
                    {formatWeekOf(r.week_of)}
                  </td>
                  <td className="rp-td">
                    <TypeBadge type={r.type} />
                  </td>
                  <td className="rp-td rp-td--right rp-td--muted">
                    {formatBytes(r.size_bytes)}
                  </td>
                  <td className="rp-td rp-td--muted">
                    {formatCreatedAt(r.created_at)}
                  </td>
                  <td className="rp-td rp-td--center">
                    <button
                      className="rp-download-btn"
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
        <div className="rp-show-more-wrap">
          <button className="rp-show-more-btn" onClick={() => setShowAll(true)}>
            Afficher plus ({filtered.length - PAGE_SIZE} rapports supplémentaires)
          </button>
        </div>
      )}
    </div>
  );
}
