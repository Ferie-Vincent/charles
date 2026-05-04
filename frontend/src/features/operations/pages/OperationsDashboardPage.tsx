import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { getOperations } from '../api/get-operations';
import { approvePurchaseOrder } from '../../achats/api/purchase-orders';
import { api } from '../../../lib/api';
import SkeletonPage from '../../../components/ui/SkeletonPage';
import PageHeader from '../../../components/ui/PageHeader';

function fmtAmount(n: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(n);
}

function AgeBadge({ days }: { days: number }) {
  const urgent = days >= 2;
  return (
    <span
      className="badge"
      style={urgent
        ? { background: '#ef444415', color: 'var(--danger)', borderColor: '#ef444435' }
        : { background: 'var(--border)', color: 'var(--text-muted)', borderColor: 'var(--border)' }
      }
    >
      {days}j
    </span>
  );
}

function HealthBadge({ score }: { score: number }) {
  const cls = score >= 75 ? 'ops-badge--green' : score >= 50 ? 'ops-badge--orange' : 'ops-badge--red';
  return <span className={`ops-badge ${cls}`}>{score}/100</span>;
}

function PanelHeader({ title, to, label }: { title: string; to?: string; label?: string }) {
  return (
    <div className="ops-panel-head">
      <span className="ops-panel-head__title">{title}</span>
      {to && <Link to={to} className="ops-panel-head__link">{label ?? 'Voir tous →'}</Link>}
    </div>
  );
}

function EmptyRow({ cols }: { cols: number }) {
  return (
    <tr>
      <td colSpan={cols} style={{ padding: '20px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
        Aucun élément.
      </td>
    </tr>
  );
}

export default function OperationsDashboardPage() {
  const qc = useQueryClient();
  const [approvingId, setApprovingId] = useState<number | null>(null);
  const [validatingDqeId, setValidatingDqeId] = useState<number | null>(null);
  const [validatingInvId, setValidatingInvId] = useState<number | null>(null);

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

  async function handleApproveBdc(id: number) {
    if (!confirm('Approuver ce bon de commande ?')) return;
    setApprovingId(id);
    approveMutation.mutate(id);
  }

  async function handleValidateDqe(e: React.MouseEvent, projectId: number, dqeId: number) {
    e.stopPropagation();
    setValidatingDqeId(dqeId);
    try {
      await api.patch(`/projects/${projectId}/dqe-versions/${dqeId}/transition`, { to: 'validated' });
      qc.invalidateQueries({ queryKey: ['portfolio-operations'] });
    } finally {
      setValidatingDqeId(null);
    }
  }

  async function handleValidateInvoice(e: React.MouseEvent, projectId: number, invoiceId: number) {
    e.stopPropagation();
    setValidatingInvId(invoiceId);
    try {
      await api.patch(`/projects/${projectId}/invoices/${invoiceId}/transition`, { status: 'validee' });
      qc.invalidateQueries({ queryKey: ['portfolio-operations'] });
    } finally {
      setValidatingInvId(null);
    }
  }

  if (isLoading) return <div className="page-content"><SkeletonPage rows={3} /></div>;
  if (error || !data) return <div className="ops-error">Erreur de chargement.</div>;

  const { health_summary, budget_summary, bdc_pending, stock_alerts, critical_projects, dqe_pending, invoices_pending } = data;

  const urgentBdc = bdc_pending.filter(b => b.age_days >= 2);
  const urgentDqe = dqe_pending.filter(d => d.age_days >= 2);
  const urgentInv = invoices_pending.filter(i => i.age_days >= 2);

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
              <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
            </svg>
          </div>
          <div className="proj-kpi__body">
            <div className="proj-kpi__value">
              {fmtAmount(budget_summary.engage)}
              <small style={{ fontSize: '0.55em', fontWeight: 400, marginLeft: 4 }}>
                ({budget_summary.tauxEngage}%)
              </small>
            </div>
            <div className="proj-kpi__label">Budget engagé / prévisionnel</div>
          </div>
        </div>

        <div className="proj-kpi">
          <div className="proj-kpi__icon proj-kpi__icon--orange">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
          <div className="proj-kpi__body">
            <div className="proj-kpi__value" style={{ color: bdc_pending.length > 0 ? '#ef4444' : undefined }}>
              {bdc_pending.length}
            </div>
            <div className="proj-kpi__label">BDC en attente</div>
          </div>
        </div>

        <div className="proj-kpi">
          <div className="proj-kpi__icon" style={{ background: '#6366f115', color: '#6366f1' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
            </svg>
          </div>
          <div className="proj-kpi__body">
            <div className="proj-kpi__value" style={{ color: dqe_pending.length > 0 ? '#6366f1' : undefined }}>
              {dqe_pending.length}
            </div>
            <div className="proj-kpi__label">DQE en attente de validation</div>
          </div>
        </div>

        <div className="proj-kpi">
          <div className="proj-kpi__icon proj-kpi__icon--red">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <div className="proj-kpi__body">
            <div className="proj-kpi__value" style={{ color: stock_alerts.length > 0 ? '#ef4444' : undefined }}>
              {stock_alerts.length}
            </div>
            <div className="proj-kpi__label">Stocks en alerte</div>
          </div>
        </div>
      </div>

      {/* Alert banners */}
      {urgentBdc.length > 0 && (
        <div className="acct-pending-banner">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <strong>{urgentBdc.length} BDC en attente depuis +48h</strong>
          <span>— approbation urgente requise</span>
        </div>
      )}
      {urgentDqe.length > 0 && (
        <div className="acct-pending-banner" style={{ borderLeftColor: '#6366f1' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
          </svg>
          <strong>{urgentDqe.length} DQE en attente depuis +48h</strong>
          <span>— validation requise</span>
        </div>
      )}
      {urgentInv.length > 0 && (
        <div className="acct-pending-banner" style={{ borderLeftColor: '#10b981' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>
          </svg>
          <strong>{urgentInv.length} facture{urgentInv.length > 1 ? 's' : ''} en attente depuis +48h</strong>
          <span>— validation requise</span>
        </div>
      )}

      {/* BLOC 2 — BDC + Stocks (2 colonnes) */}
      <div className="ops-2col">
        <div className="ops-panel">
          <PanelHeader title="BDC en attente d'approbation" to="/achats" />
          <table className="data-table">
            <thead>
              <tr>
                <th>Référence</th>
                <th>Chantier</th>
                <th style={{ textAlign: 'right' }}>Montant</th>
                <th>Âge</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {bdc_pending.length === 0 && <EmptyRow cols={5} />}
              {bdc_pending.map(bdc => (
                <tr key={bdc.id}>
                  <td>
                    <code style={{ fontSize: '0.82rem', color: 'var(--accent)', fontWeight: 600 }}>{bdc.reference}</code>
                    {bdc.supplier !== '—' && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{bdc.supplier}</div>}
                  </td>
                  <td>
                    {bdc.project
                      ? <Link to={`/projects/${bdc.project.id}`} style={{ color: 'var(--accent)', fontWeight: 500, textDecoration: 'none' }}>{bdc.project.code}</Link>
                      : '—'}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>{fmtAmount(bdc.total_amount)}</td>
                  <td><AgeBadge days={bdc.age_days} /></td>
                  <td>
                    <button
                      className="btn btn--sm acct-btn--approve"
                      disabled={approvingId === bdc.id}
                      onClick={() => handleApproveBdc(bdc.id)}
                    >
                      {approvingId === bdc.id ? '…' : 'Approuver'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="ops-panel">
          <PanelHeader title="Stocks en alerte" to="/stocks" />
          <table className="data-table">
            <thead>
              <tr>
                <th>Article</th>
                <th>Qté</th>
                <th>Seuil</th>
                <th>Déficit</th>
              </tr>
            </thead>
            <tbody>
              {stock_alerts.length === 0 && <EmptyRow cols={4} />}
              {stock_alerts.map(s => (
                <tr key={s.id}>
                  <td style={{ fontWeight: 600, color: 'var(--text-body)' }}>{s.name}</td>
                  <td style={{ color: 'var(--danger)', fontWeight: 600 }}>{s.quantity} {s.unit}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{s.threshold}</td>
                  <td>
                    <span className="badge" style={{ background: '#ef444415', color: 'var(--danger)', borderColor: '#ef444435' }}>
                      −{s.deficit}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* BLOC 3 — DQE en attente de validation */}
      <div className="ops-panel" style={{ marginBottom: 16 }}>
        <PanelHeader title="DQE en attente de validation" to="/portfolio/dqe" label="Portfolio DQE →" />
        <table className="data-table">
          <thead>
            <tr>
              <th>Version</th>
              <th>Chantier</th>
              <th style={{ textAlign: 'right' }}>Total HT</th>
              <th>Âge</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {dqe_pending.length === 0 && <EmptyRow cols={5} />}
            {dqe_pending.map(dqe => (
              <tr key={dqe.id}>
                <td>
                  <span style={{ fontWeight: 600, color: 'var(--text-body)' }}>{dqe.name}</span>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>v{dqe.version_number}</div>
                </td>
                <td>
                  <Link to={`/projects/${dqe.project_id}/dqe`} style={{ color: 'var(--accent)', fontWeight: 500, textDecoration: 'none' }}>
                    {dqe.project_code}
                  </Link>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{dqe.project_name}</div>
                </td>
                <td style={{ textAlign: 'right', fontWeight: 700 }}>{fmtAmount(dqe.total_ht)}</td>
                <td><AgeBadge days={dqe.age_days} /></td>
                <td>
                  <button
                    className="btn btn--sm acct-btn--approve"
                    disabled={validatingDqeId === dqe.id}
                    onClick={(e) => handleValidateDqe(e, dqe.project_id, dqe.id)}
                  >
                    {validatingDqeId === dqe.id ? '…' : 'Valider'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* BLOC 4 — Factures en attente de validation */}
      <div className="ops-panel" style={{ marginBottom: 16 }}>
        <PanelHeader title="Factures en attente de validation" />
        <table className="data-table">
          <thead>
            <tr>
              <th>Référence</th>
              <th>Chantier</th>
              <th style={{ textAlign: 'right' }}>Montant HT</th>
              <th>Âge</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {invoices_pending.length === 0 && <EmptyRow cols={5} />}
            {invoices_pending.map(inv => (
              <tr key={inv.id}>
                <td>
                  <span style={{ fontWeight: 600, fontSize: '0.82rem' }}>{inv.reference}</span>
                  {inv.supplier !== '—' && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{inv.supplier}</div>}
                </td>
                <td>
                  <Link to={`/projects/${inv.project_id}/accounting`} style={{ color: 'var(--accent)', fontWeight: 500, textDecoration: 'none' }}>
                    {inv.project_code}
                  </Link>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{inv.project_name}</div>
                </td>
                <td style={{ textAlign: 'right', fontWeight: 700 }}>{fmtAmount(inv.amount_ht)}</td>
                <td><AgeBadge days={inv.age_days} /></td>
                <td>
                  <button
                    className="btn btn--sm acct-btn--approve"
                    disabled={validatingInvId === inv.id}
                    onClick={(e) => handleValidateInvoice(e, inv.project_id, inv.id)}
                  >
                    {validatingInvId === inv.id ? '…' : 'Valider'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* BLOC 5 — Chantiers critiques */}
      <div className="ops-panel">
        <PanelHeader title="Chantiers score santé < 50" />
        <table className="data-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Chantier</th>
              <th>Score santé</th>
            </tr>
          </thead>
          <tbody>
            {critical_projects.length === 0 && <EmptyRow cols={3} />}
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
      </div>
    </div>
  );
}
