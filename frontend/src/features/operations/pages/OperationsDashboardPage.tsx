import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { getOperations } from '../api/get-operations';
import { approvePurchaseOrder } from '../../achats/api/purchase-orders';
import PageHeader from '../../../components/ui/PageHeader';

function fmtAmount(n: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(n);
}

function HealthBadge({ score }: { score: number }) {
  const cls = score >= 75 ? 'ops-badge--green' : score >= 50 ? 'ops-badge--orange' : 'ops-badge--red';
  return <span className={`ops-badge ${cls}`}>{score}/100</span>;
}

export default function OperationsDashboardPage() {
  const qc = useQueryClient();
  const [approvingId, setApprovingId] = useState<number | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['portfolio-operations'],
    queryFn: getOperations,
    refetchInterval: 60_000,
  });

  const approveMutation = useMutation({
    mutationFn: (id: number) => approvePurchaseOrder(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['portfolio-operations'] }),
    onSettled: () => setApprovingId(null),
  });

  function handleApprove(id: number) {
    if (!confirm('Approuver ce bon de commande ?')) return;
    setApprovingId(id);
    approveMutation.mutate(id);
  }

  if (isLoading) return <div className="ops-loading">Chargement…</div>;
  if (error || !data) return <div className="ops-error">Erreur de chargement.</div>;

  const { health_summary, budget_summary, bdc_pending, stock_alerts, critical_projects } = data;

  return (
    <div>
      <PageHeader
        breadcrumb="DIRECTION · 2026"
        title="Dashboard Opérationnel"
        subtitle="Pilotage DT/DG — alertes actionnables en temps réel."
      />

      {/* BLOC 1 — KPIs */}
      <div className="proj-kpi-row">
        <div className="proj-kpi">
          <div className="proj-kpi__icon proj-kpi__icon--green">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
            </svg>
          </div>
          <div className="proj-kpi__body">
            <div className="proj-kpi__value">{health_summary.avg_score}<small style={{ fontSize: '0.65em', fontWeight: 400 }}>/100</small></div>
            <div className="proj-kpi__label">Score santé portefeuille</div>
          </div>
        </div>

        <div className="proj-kpi">
          <div className="proj-kpi__icon proj-kpi__icon--blue">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>
            </svg>
          </div>
          <div className="proj-kpi__body">
            <div className="proj-kpi__value">{health_summary.total_active}</div>
            <div className="proj-kpi__label">Chantiers actifs</div>
          </div>
        </div>

        <div className="proj-kpi">
          <div className="proj-kpi__icon proj-kpi__icon--orange">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
          <div className="proj-kpi__body">
            <div
              className="proj-kpi__value"
              style={{ color: bdc_pending.length > 0 ? '#ef4444' : undefined }}
            >
              {bdc_pending.length}
            </div>
            <div className="proj-kpi__label">BDC en attente d'approbation</div>
          </div>
        </div>

        <div className="proj-kpi">
          <div className="proj-kpi__icon proj-kpi__icon--red">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <div className="proj-kpi__body">
            <div
              className="proj-kpi__value"
              style={{ color: stock_alerts.length > 0 ? '#ef4444' : undefined }}
            >
              {stock_alerts.length}
            </div>
            <div className="proj-kpi__label">Stocks en alerte</div>
          </div>
        </div>
      </div>

      {/* Alert banners */}
      {bdc_pending.some(b => b.age_days >= 2) && (
        <div className="acct-pending-banner">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <strong>{bdc_pending.filter(b => b.age_days >= 2).length} BDC en attente depuis +48h</strong>
          <span>— approbation urgente requise</span>
        </div>
      )}

      {/* BLOC 2 — BDC en attente */}
      <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
          <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-body)' }}>BDC en attente d'approbation</span>
          <Link to="/achats" style={{ fontSize: '0.82rem', color: 'var(--accent)', textDecoration: 'none' }}>Voir tous →</Link>
        </div>
        {bdc_pending.length === 0 ? (
          <p style={{ padding: 24, color: 'var(--text-muted)', textAlign: 'center' }}>Aucun BDC en attente.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Référence</th>
                <th>Fournisseur</th>
                <th>Chantier</th>
                <th style={{ textAlign: 'right' }}>Montant</th>
                <th>Âge</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {bdc_pending.map(bdc => (
                <tr key={bdc.id}>
                  <td>
                    <code style={{ fontSize: '0.82rem', color: 'var(--accent)', fontWeight: 600 }}>{bdc.reference}</code>
                  </td>
                  <td>{bdc.supplier}</td>
                  <td>
                    {bdc.project
                      ? <Link to={`/projects/${bdc.project.id}`} style={{ color: 'var(--accent)', fontWeight: 500, textDecoration: 'none' }}>{bdc.project.code}</Link>
                      : '—'}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>{fmtAmount(bdc.total_amount)}</td>
                  <td>
                    <span
                      className="badge"
                      style={bdc.age_days >= 2
                        ? { background: '#ef444415', color: '#ef4444', borderColor: '#ef444435' }
                        : { background: 'var(--border)', color: 'var(--text-muted)', borderColor: 'var(--border)' }
                      }
                    >
                      {bdc.age_days}j
                    </span>
                  </td>
                  <td>
                    <button
                      className="btn btn--sm acct-btn--approve"
                      disabled={approvingId === bdc.id}
                      onClick={() => handleApprove(bdc.id)}
                    >
                      {approvingId === bdc.id ? '…' : 'Approuver'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* BLOC 3 — Stocks en alerte */}
      <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
          <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-body)' }}>Stocks en alerte</span>
          <Link to="/stocks" style={{ fontSize: '0.82rem', color: 'var(--accent)', textDecoration: 'none' }}>Voir tous →</Link>
        </div>
        {stock_alerts.length === 0 ? (
          <p style={{ padding: 24, color: 'var(--text-muted)', textAlign: 'center' }}>Aucun stock en alerte.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Article</th>
                <th>Quantité actuelle</th>
                <th>Seuil minimum</th>
                <th>Déficit</th>
              </tr>
            </thead>
            <tbody>
              {stock_alerts.map(s => (
                <tr key={s.id}>
                  <td>
                    <span style={{ fontWeight: 600, color: 'var(--text-body)' }}>{s.name}</span>
                  </td>
                  <td style={{ color: '#ef4444', fontWeight: 600 }}>{s.quantity} {s.unit}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{s.threshold} {s.unit}</td>
                  <td>
                    <span className="badge" style={{ background: '#ef444415', color: '#ef4444', borderColor: '#ef444435' }}>
                      −{s.deficit} {s.unit}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* BLOC 4 — Chantiers critiques */}
      <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
          <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-body)' }}>Chantiers score santé &lt; 50</span>
        </div>
        {critical_projects.length === 0 ? (
          <p style={{ padding: 24, color: 'var(--text-muted)', textAlign: 'center' }}>Aucun chantier en situation critique.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Chantier</th>
                <th>Score santé</th>
              </tr>
            </thead>
            <tbody>
              {critical_projects.map(p => (
                <tr key={p.id}>
                  <td>
                    <Link to={`/projects/${p.id}`} style={{ color: 'var(--accent)', fontWeight: 700, textDecoration: 'none', fontSize: '0.82rem' }}>
                      {p.code}
                    </Link>
                  </td>
                  <td style={{ fontWeight: 500, color: 'var(--text-body)' }}>{p.name}</td>
                  <td><HealthBadge score={p.health_score} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
