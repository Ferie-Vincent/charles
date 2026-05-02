import SkeletonPage from '../../../components/ui/SkeletonPage';
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

const STATUS_BADGE: Record<DqeStatus, string> = {
  draft:     'badge badge-draft',
  validated: 'badge badge-active',
  archived:  'badge badge-archived',
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
    <div>
      <PageHeader title="DQE — Devis Quantitatifs Estimatifs" />

      <div className="proj-kpi-row">
        <div className="proj-kpi">
          <div className="proj-kpi__icon proj-kpi__icon--blue">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M9 12h6M9 16h6M9 8h6M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/>
            </svg>
          </div>
          <div className="proj-kpi__body">
            <div className="proj-kpi__value">{counts.all}</div>
            <div className="proj-kpi__label">Versions DQE</div>
          </div>
        </div>

        <div className="proj-kpi">
          <div className="proj-kpi__icon proj-kpi__icon--orange">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
            </svg>
          </div>
          <div className="proj-kpi__body">
            <div className="proj-kpi__value">{counts.draft}</div>
            <div className="proj-kpi__label">En brouillon</div>
          </div>
        </div>

        <div className="proj-kpi">
          <div className="proj-kpi__icon proj-kpi__icon--green">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <div className="proj-kpi__body">
            <div className="proj-kpi__value">{counts.validated}</div>
            <div className="proj-kpi__label">Validés</div>
          </div>
        </div>

        <div className="proj-kpi">
          <div className="proj-kpi__icon proj-kpi__icon--teal">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
            </svg>
          </div>
          <div className="proj-kpi__body">
            <div className="proj-kpi__value" style={{ fontSize: 15 }}>{fmtHT(totalHT)}</div>
            <div className="proj-kpi__label">Total portefeuille HT (FCFA)</div>
          </div>
        </div>
      </div>

      <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', gap: 6, padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
          {(['all', 'draft', 'validated', 'archived'] as const).map(f => (
            <button
              key={f}
              className={`bud-tab${filter === f ? ' bud-tab--active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {FILTER_LABELS[f]}
              <span style={{
                marginLeft: 6,
                fontSize: 10,
                fontWeight: 700,
                background: filter === f ? 'rgba(255,255,255,0.2)' : 'var(--border)',
                color: filter === f ? 'inherit' : 'var(--text-muted)',
                borderRadius: 4,
                padding: '1px 5px',
              }}>
                {counts[f]}
              </span>
            </button>
          ))}
        </div>

        {isLoading ? (
          <SkeletonPage rows={2} />
        ) : filtered.length === 0 ? (
          <p className="empty-state">Aucun DQE trouvé.</p>
        ) : (
          <table className="data-table">
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
                <tr key={v.id}>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <code style={{ fontSize: 11, color: 'var(--text-muted)' }}>{v.project_code}</code>
                      <span style={{ fontWeight: 500 }}>{v.project_name}</span>
                    </div>
                  </td>
                  <td>
                    <span style={{
                      display: 'inline-block',
                      fontSize: 11,
                      fontWeight: 700,
                      padding: '2px 7px',
                      borderRadius: 6,
                      background: '#EFF6FF',
                      color: '#1D4ED8',
                    }}>
                      v{v.version_number}
                    </span>
                  </td>
                  <td style={{ maxWidth: 260, fontWeight: 500 }}>{v.name}</td>
                  <td>
                    <span className={STATUS_BADGE[v.status]}>
                      {STATUS_LABELS[v.status]}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right', color: 'var(--text-muted)' }}>
                    {v.lines_count}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>
                    {fmtHT(v.total_ht)}{' '}
                    <span style={{ fontWeight: 400, fontSize: 11, color: 'var(--text-muted)' }}>FCFA</span>
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: 12, whiteSpace: 'nowrap' }}>
                    {fmtDate(v.updated_at)}
                  </td>
                  <td>
                    <button
                      className="btn-primary"
                      style={{ padding: '5px 12px', fontSize: 12 }}
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
