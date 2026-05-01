import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getPortfolioDqe, type PortfolioDqeItem } from '../api/dqe-api';
import { STATUS_LABELS, type DqeStatus } from '../types';
import PageHeader from '../../../components/ui/PageHeader';

function fmtHT(n: number) {
  return n.toLocaleString('fr-FR', { maximumFractionDigits: 0 });
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

const FILTER_LABELS: Record<string, string> = {
  all:       'Tous',
  draft:     'Brouillon',
  validated: 'Validé',
  archived:  'Archivé',
};

export default function DqePage() {
  const nav = useNavigate();
  const [filter, setFilter] = useState<DqeStatus | 'all'>('all');

  const { data = [], isLoading } = useQuery({
    queryKey: ['portfolio-dqe'],
    queryFn: getPortfolioDqe,
  });

  const filtered = filter === 'all' ? data : data.filter(v => v.status === filter);

  const counts = {
    all:       data.length,
    draft:     data.filter(v => v.status === 'draft').length,
    validated: data.filter(v => v.status === 'validated').length,
    archived:  data.filter(v => v.status === 'archived').length,
  };

  const totalHT = data.reduce((s, v) => s + v.total_ht, 0);

  return (
    <div className="dqe-page">
      <PageHeader
        breadcrumb="PORTEFEUILLE"
        title="DQE — Devis Quantitatifs Estimatifs"
        subtitle="Versions par chantier, statuts et montants HT"
      />

      <div className="dqe-page__kpi">
        <div className="dqe-kpi-card dqe-kpi-card--total">
          <div className="dqe-kpi-card__value">{counts.all}</div>
          <div className="dqe-kpi-card__label">Versions DQE</div>
        </div>
        <div className="dqe-kpi-card dqe-kpi-card--draft">
          <div className="dqe-kpi-card__value">{counts.draft}</div>
          <div className="dqe-kpi-card__label">En brouillon</div>
        </div>
        <div className="dqe-kpi-card dqe-kpi-card--valid">
          <div className="dqe-kpi-card__value">{counts.validated}</div>
          <div className="dqe-kpi-card__label">Validés</div>
        </div>
        <div className="dqe-kpi-card dqe-kpi-card--hero">
          <div className="dqe-kpi-card__label">Total portefeuille HT</div>
          <div className="dqe-kpi-card__value">{fmtHT(totalHT)} FCFA</div>
        </div>
      </div>

      <div className="dqe-page__toolbar">
        {(['all', 'draft', 'validated', 'archived'] as const).map(f => (
          <button
            key={f}
            className={`dqe-filter-btn${filter === f ? ' dqe-filter-btn--active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {FILTER_LABELS[f]}
            <span className="dqe-filter-count">{counts[f]}</span>
          </button>
        ))}
      </div>

      <div className="dqe-page__table-wrap">
        {isLoading ? (
          <div className="dqe-page__empty">Chargement…</div>
        ) : filtered.length === 0 ? (
          <div className="dqe-page__empty">Aucun DQE trouvé.</div>
        ) : (
          <table className="dqe-page-table">
            <thead>
              <tr>
                <th>Chantier</th>
                <th>Ver.</th>
                <th>Nom</th>
                <th>Statut</th>
                <th style={{ textAlign: 'right' }}>Lignes</th>
                <th style={{ textAlign: 'right' }}>Total HT</th>
                <th>Modifié le</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((v: PortfolioDqeItem) => (
                <tr key={v.id} className={`dqe-page-table__row dqe-page-table__row--${v.status}`}>
                  <td>
                    <div className="dqe-page-table__project">
                      <span className="dqe-page-table__code">{v.project_code}</span>
                      <span className="dqe-page-table__name">{v.project_name}</span>
                    </div>
                  </td>
                  <td>
                    <span className="dqe-ver-badge">v{v.version_number}</span>
                  </td>
                  <td style={{ maxWidth: 260 }}>{v.name}</td>
                  <td>
                    <span className={`dqe-status-badge dqe-status-badge--${v.status}`}>
                      {STATUS_LABELS[v.status]}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right', color: 'var(--text-muted)' }}>
                    {v.lines_count}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <span className="dqe-amount">{fmtHT(v.total_ht)}</span>
                    <span className="dqe-amount-unit">FCFA</span>
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: 12, whiteSpace: 'nowrap' }}>
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
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
