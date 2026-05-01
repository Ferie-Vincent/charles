import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getPortfolioDqe, type PortfolioDqeItem } from '../api/dqe-api';
import { STATUS_LABELS, type DqeStatus } from '../types';
import PageHeader from '../../../components/ui/PageHeader';

function fmtHT(n: number) {
  return n.toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' FCFA';
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

const STATUS_STYLE: Record<DqeStatus, { bg: string; color: string }> = {
  draft:     { bg: '#f1f5f9', color: '#475569' },
  validated: { bg: '#dcfce7', color: '#166534' },
  archived:  { bg: '#fef3c7', color: '#92400e' },
};

export default function DqePage() {
  const nav = useNavigate();
  const [filter, setFilter] = useState<DqeStatus | 'all'>('all');

  const { data = [], isLoading } = useQuery({
    queryKey: ['portfolio-dqe'],
    queryFn: getPortfolioDqe,
  });

  const filtered = filter === 'all' ? data : data.filter(v => v.status === filter);

  const stats = {
    total:     data.length,
    draft:     data.filter(v => v.status === 'draft').length,
    validated: data.filter(v => v.status === 'validated').length,
    totalHT:   data.reduce((s, v) => s + v.total_ht, 0),
  };

  return (
    <div className="dqe-page">
      <PageHeader title="DQE — Devis Quantitatifs Estimatifs" />

      <div className="dqe-page__kpi">
        <div className="dqe-kpi-card">
          <div className="dqe-kpi-card__value">{stats.total}</div>
          <div className="dqe-kpi-card__label">Versions DQE</div>
        </div>
        <div className="dqe-kpi-card">
          <div className="dqe-kpi-card__value" style={{ color: '#d97706' }}>{stats.draft}</div>
          <div className="dqe-kpi-card__label">En brouillon</div>
        </div>
        <div className="dqe-kpi-card">
          <div className="dqe-kpi-card__value" style={{ color: '#16a34a' }}>{stats.validated}</div>
          <div className="dqe-kpi-card__label">Validés</div>
        </div>
        <div className="dqe-kpi-card">
          <div className="dqe-kpi-card__value" style={{ fontSize: 18 }}>{fmtHT(stats.totalHT)}</div>
          <div className="dqe-kpi-card__label">Total portefeuille HT</div>
        </div>
      </div>

      <div className="dqe-page__filters">
        {(['all', 'draft', 'validated', 'archived'] as const).map(f => (
          <button
            key={f}
            className={`dqe-filter-btn${filter === f ? ' dqe-filter-btn--active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? 'Tous' : STATUS_LABELS[f as DqeStatus]}
          </button>
        ))}
      </div>

      <div className="dqe-page__table-wrap">
        {isLoading ? (
          <p className="dqe-empty">Chargement…</p>
        ) : filtered.length === 0 ? (
          <p className="dqe-empty">Aucun DQE trouvé.</p>
        ) : (
          <table className="dqe-page-table">
            <thead>
              <tr>
                <th>Chantier</th>
                <th>Version</th>
                <th>Nom</th>
                <th>Statut</th>
                <th style={{ textAlign: 'right' }}>Lignes</th>
                <th style={{ textAlign: 'right' }}>Total HT</th>
                <th>Modifié le</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((v: PortfolioDqeItem) => {
                const st = STATUS_STYLE[v.status] ?? STATUS_STYLE.draft;
                return (
                  <tr key={v.id} className="dqe-page-table__row">
                    <td>
                      <div className="dqe-page-table__project">
                        <span className="dqe-page-table__code">{v.project_code}</span>
                        <span className="dqe-page-table__name">{v.project_name}</span>
                      </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className="dqe-ver-badge">v{v.version_number}</span>
                    </td>
                    <td>{v.name}</td>
                    <td>
                      <span
                        className="dqe-status-badge"
                        style={{ background: st.bg, color: st.color }}
                      >
                        {STATUS_LABELS[v.status]}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', color: 'var(--text-subtle)' }}>
                      {v.lines_count}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>
                      {fmtHT(v.total_ht)}
                    </td>
                    <td style={{ color: 'var(--text-subtle)', fontSize: 12 }}>
                      {fmtDate(v.updated_at)}
                    </td>
                    <td>
                      <button
                        className="dqe-open-btn"
                        onClick={() => nav(`/projects/${v.project_id}/dqe/${v.id}`)}
                      >
                        Ouvrir →
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
