import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  getOperations,
  type BdcPending,
  type StockAlert,
  type CriticalProject,
  type InvoicePending,
  type DqePending,
} from '../api/get-operations';
import { approvePurchaseOrder } from '../../achats/api/purchase-orders';
import { transitionDqeVersion } from '../../dqe/api/dqe-api';
import { api } from '../../../lib/api';
import SkeletonPage from '../../../components/ui/SkeletonPage';
import PageHeader from '../../../components/ui/PageHeader';

/* ─── helpers ───────────────────────────────────────────────────── */
function fmtAmount(n: number) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XOF',
    maximumFractionDigits: 0,
  }).format(n);
}

function HealthBadge({ score }: { score: number }) {
  const cls =
    score >= 75 ? 'ops-badge--green' : score >= 50 ? 'ops-badge--orange' : 'ops-badge--red';
  return <span className={`ops-badge ${cls}`}>{score}/100</span>;
}

function AgeBadge({ days }: { days: number }) {
  return (
    <span
      className="badge"
      style={
        days >= 2
          ? { background: '#ef444415', color: 'var(--danger)', borderColor: '#ef444435' }
          : { background: 'var(--border)', color: 'var(--text-muted)', borderColor: 'var(--border)' }
      }
    >
      {days}j
    </span>
  );
}

/* ─── sub-section cards ─────────────────────────────────────────── */
function CardShell({
  title,
  linkLabel,
  linkTo,
  children,
  style,
}: {
  title: string;
  linkLabel?: string;
  linkTo?: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div className="card" style={{ overflow: 'hidden', marginBottom: 0, ...style }}>
      <div className="card-head">
        <span className="card-title" style={{ marginBottom: 0 }}>{title}</span>
        {linkLabel && linkTo && (
          <Link to={linkTo} style={{ fontSize: '0.82rem', color: 'var(--accent)', textDecoration: 'none' }}>
            {linkLabel} →
          </Link>
        )}
      </div>
      {children}
    </div>
  );
}

/* ─── BDC table ─────────────────────────────────────────────────── */
function BdcTable({
  rows,
  approvingId,
  onApprove,
}: {
  rows: BdcPending[];
  approvingId: number | null;
  onApprove: (id: number) => void;
}) {
  if (rows.length === 0)
    return <p style={{ padding: '20px 18px', color: 'var(--text-muted)', textAlign: 'center', fontSize: '0.85rem' }}>Aucun BDC en attente.</p>;

  return (
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
        {rows.map(bdc => (
          <tr key={bdc.id}>
            <td>
              <code style={{ fontSize: '0.82rem', color: 'var(--accent)', fontWeight: 600 }}>
                {bdc.reference}
              </code>
            </td>
            <td>{bdc.supplier}</td>
            <td>
              {bdc.project ? (
                <Link to={`/projects/${bdc.project.id}`} style={{ color: 'var(--accent)', fontWeight: 500, textDecoration: 'none' }}>
                  {bdc.project.code}
                </Link>
              ) : '—'}
            </td>
            <td style={{ textAlign: 'right', fontWeight: 700 }}>{fmtAmount(bdc.total_amount)}</td>
            <td><AgeBadge days={bdc.age_days} /></td>
            <td>
              <button
                className="btn btn--sm acct-btn--approve"
                disabled={approvingId === bdc.id}
                onClick={() => onApprove(bdc.id)}
              >
                {approvingId === bdc.id ? '…' : 'Approuver'}
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/* ─── Factures table ────────────────────────────────────────────── */
function InvoicesTable({
  rows,
  validatingId,
  onValidate,
}: {
  rows: InvoicePending[];
  validatingId: number | null;
  onValidate: (projectId: number, invoiceId: number) => void;
}) {
  if (rows.length === 0)
    return <p style={{ padding: '20px 18px', color: 'var(--text-muted)', textAlign: 'center', fontSize: '0.85rem' }}>Aucune facture en attente.</p>;

  return (
    <table className="data-table">
      <thead>
        <tr>
          <th>Référence</th>
          <th>Fournisseur</th>
          <th>Chantier</th>
          <th style={{ textAlign: 'right' }}>Montant HT</th>
          <th>Âge</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {rows.map(inv => (
          <tr key={inv.id}>
            <td>
              <code style={{ fontSize: '0.82rem', color: 'var(--accent)', fontWeight: 600 }}>
                {inv.reference}
              </code>
            </td>
            <td>{inv.supplier}</td>
            <td>
              <Link to={`/projects/${inv.project_id}`} style={{ color: 'var(--accent)', fontWeight: 500, textDecoration: 'none' }}>
                {inv.project_code}
              </Link>
            </td>
            <td style={{ textAlign: 'right', fontWeight: 700 }}>{fmtAmount(inv.amount_ht)}</td>
            <td><AgeBadge days={inv.age_days} /></td>
            <td>
              <button
                className="btn btn--sm acct-btn--approve"
                disabled={validatingId === inv.id}
                onClick={() => onValidate(inv.project_id, inv.id)}
              >
                {validatingId === inv.id ? '…' : 'Valider'}
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/* ─── Stock alerts table ─────────────────────────────────────────── */
function StocksTable({ rows }: { rows: StockAlert[] }) {
  if (rows.length === 0)
    return <p style={{ padding: '20px 18px', color: 'var(--text-muted)', textAlign: 'center', fontSize: '0.85rem' }}>Aucun stock en alerte.</p>;

  return (
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
        {rows.map(s => (
          <tr key={s.id}>
            <td style={{ fontWeight: 600, color: 'var(--text-body)' }}>{s.name}</td>
            <td style={{ color: 'var(--danger)', fontWeight: 600 }}>{s.quantity} {s.unit}</td>
            <td style={{ color: 'var(--text-muted)' }}>{s.threshold} {s.unit}</td>
            <td>
              <span className="badge" style={{ background: '#ef444415', color: 'var(--danger)', borderColor: '#ef444435' }}>
                −{s.deficit} {s.unit}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/* ─── Critical projects table ───────────────────────────────────── */
function CriticalProjectsTable({ rows }: { rows: CriticalProject[] }) {
  if (rows.length === 0)
    return <p style={{ padding: '20px 18px', color: 'var(--text-muted)', textAlign: 'center', fontSize: '0.85rem' }}>Aucun chantier en situation critique.</p>;

  return (
    <table className="data-table">
      <thead>
        <tr>
          <th>Code</th>
          <th>Chantier</th>
          <th>Score santé</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(p => (
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
  );
}

/* ─── DQE pending table ─────────────────────────────────────────── */
function DqeTable({
  rows,
  validatingId,
  onValidate,
}: {
  rows: DqePending[];
  validatingId: number | null;
  onValidate: (projectId: number, dqeId: number) => void;
}) {
  if (rows.length === 0)
    return <p style={{ padding: '20px 18px', color: 'var(--text-muted)', textAlign: 'center', fontSize: '0.85rem' }}>Aucun DQE en attente de validation.</p>;

  return (
    <table className="data-table">
      <thead>
        <tr>
          <th>DQE</th>
          <th>Chantier</th>
          <th>Version</th>
          <th style={{ textAlign: 'right' }}>Total HT</th>
          <th>Âge</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {rows.map(dqe => (
          <tr key={dqe.id}>
            <td style={{ fontWeight: 600, color: 'var(--text-body)' }}>{dqe.name}</td>
            <td>
              <Link to={`/projects/${dqe.project_id}`} style={{ color: 'var(--accent)', fontWeight: 500, textDecoration: 'none' }}>
                {dqe.project_code}
              </Link>
            </td>
            <td><span className="badge">v{dqe.version_number}</span></td>
            <td style={{ textAlign: 'right', fontWeight: 700 }}>{fmtAmount(dqe.total_ht)}</td>
            <td><AgeBadge days={dqe.age_days} /></td>
            <td>
              <button
                className="btn btn--sm acct-btn--approve"
                disabled={validatingId === dqe.id}
                onClick={() => onValidate(dqe.project_id, dqe.id)}
              >
                {validatingId === dqe.id ? '…' : 'Valider'}
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/* ─── Top 3 actions priority algo ───────────────────────────────── */
type ActionType = 'bdc_urgent' | 'project_critical' | 'stock' | 'invoice';

interface PriorityAction {
  type: ActionType;
  label: string;
  href: string;
  priority: number;
}

function buildTopActions(
  bdc_pending: BdcPending[],
  critical_projects: CriticalProject[],
  stock_alerts: StockAlert[],
  invoices_pending: InvoicePending[],
): PriorityAction[] {
  const actions: PriorityAction[] = [
    ...bdc_pending
      .filter(b => b.age_days >= 2)
      .map(b => ({
        type: 'bdc_urgent' as const,
        label: `Approuver BDC ${b.reference} — +${b.age_days}j`,
        href: '/achats',
        priority: 100 + b.age_days,
      })),
    ...critical_projects.map(p => ({
      type: 'project_critical' as const,
      label: `Chantier critique: ${p.code} (${p.health_score}/100)`,
      href: `/projects/${p.id}`,
      priority: 100 - p.health_score,
    })),
    ...stock_alerts.map(s => ({
      type: 'stock' as const,
      label: `Stock critique: ${s.name} (déficit ${s.deficit} ${s.unit})`,
      href: '/stocks',
      priority: 50,
    })),
    ...invoices_pending
      .filter(i => i.age_days >= 3)
      .map(i => ({
        type: 'invoice' as const,
        label: `Valider facture ${i.reference} — +${i.age_days}j`,
        href: `/projects/${i.project_id}/accounting`,
        priority: 60 + i.age_days,
      })),
  ];
  return actions.sort((a, b) => b.priority - a.priority).slice(0, 3);
}

const ACTION_TYPE_LABEL: Record<ActionType, string> = {
  bdc_urgent: 'BDC urgent',
  project_critical: 'Chantier',
  stock: 'Stock',
  invoice: 'Facture',
};

/* ═══════════════════════════════════════════════════════════
   PAGE
   ═══════════════════════════════════════════════════════════ */
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

  function handleApproveBdc(id: number) {
    if (!confirm('Approuver ce bon de commande ?')) return;
    setApprovingId(id);
    approveMutation.mutate(id);
  }

  async function handleValidateDqe(projectId: number, dqeId: number) {
    setValidatingDqeId(dqeId);
    try {
      await transitionDqeVersion(projectId, dqeId, { status: 'validated' });
      qc.invalidateQueries({ queryKey: ['portfolio-operations'] });
    } finally {
      setValidatingDqeId(null);
    }
  }

  async function handleValidateInvoice(projectId: number, invoiceId: number) {
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

  const {
    health_summary,
    budget_summary,
    bdc_pending,
    stock_alerts,
    critical_projects,
    invoices_pending,
    dqe_pending,
  } = data;

  const urgentBdcCount = bdc_pending.filter(b => b.age_days >= 2).length;
  const topActions = buildTopActions(bdc_pending, critical_projects, stock_alerts, invoices_pending);

  return (
    <div>
      <PageHeader
        breadcrumb="DIRECTION · 2026"
        title="Pilotage Opérationnel"
        subtitle="Alertes actionnables — BDC, stocks, chantiers critiques."
        syncLabel="Actualisé automatiquement · 60s"
      />

      {/* ── KPI row ── */}
      <div className="proj-kpi-row">
        <div className="proj-kpi">
          <div className="proj-kpi__icon proj-kpi__icon--green">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </div>
          <div className="proj-kpi__body">
            <div className="proj-kpi__value">
              {health_summary.avg_score}
              <small style={{ fontSize: '0.65em', fontWeight: 400 }}>/100</small>
            </div>
            <div className="proj-kpi__label">Score santé portefeuille</div>
          </div>
        </div>

        <div className="proj-kpi">
          <div className="proj-kpi__icon proj-kpi__icon--blue">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8M12 17v4" />
            </svg>
          </div>
          <div className="proj-kpi__body">
            <div
              className="proj-kpi__value"
              style={{ color: budget_summary.tauxEngage > 90 ? '#ef4444' : undefined }}
            >
              {budget_summary.tauxEngage}
              <small style={{ fontSize: '0.65em', fontWeight: 400 }}>%</small>
            </div>
            <div className="proj-kpi__label">Taux d'engagement budget</div>
          </div>
        </div>

        <div className="proj-kpi">
          <div className="proj-kpi__icon proj-kpi__icon--orange">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div className="proj-kpi__body">
            <div className="proj-kpi__value" style={{ color: bdc_pending.length > 0 ? '#ef4444' : undefined }}>
              {bdc_pending.length}
            </div>
            <div className="proj-kpi__label">BDC en attente d'approbation</div>
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
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
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

      {/* ── Alert banners ── */}
      {urgentBdcCount > 0 && (
        <div className="ops-banner ops-banner--danger">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <strong>{urgentBdcCount} BDC en attente +48h</strong>
          <span>— approbation urgente requise</span>
        </div>
      )}

      {budget_summary.tauxEngage > 90 && (
        <div className="ops-banner ops-banner--warning">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <strong>Budget engagé à {budget_summary.tauxEngage}%</strong>
          <span>— seuil critique dépassé</span>
        </div>
      )}

      {/* ── Top 3 actions du jour ── */}
      {topActions.length > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-head">
            <span className="card-title" style={{ marginBottom: 0 }}>Top {topActions.length} actions du jour</span>
          </div>
          <div className="ops-actions-list">
            {topActions.map((action, i) => (
              <Link key={i} to={action.href} className="ops-action-item">
                <span className={`ops-action-dot ops-action-dot--${action.type}`} />
                <span style={{ flex: 1 }}>{action.label}</span>
                <span className="badge" style={{ background: 'var(--border)', color: 'var(--text-muted)', borderColor: 'var(--border)', flexShrink: 0 }}>
                  {ACTION_TYPE_LABEL[action.type]}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ── 2-col grid ── */}
      <div className="ops-grid">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <CardShell title="BDC en attente d'approbation" linkLabel="Voir tous" linkTo="/achats">
            <BdcTable rows={bdc_pending} approvingId={approvingId} onApprove={handleApproveBdc} />
          </CardShell>

          <CardShell title="Factures en attente de validation">
            <InvoicesTable rows={invoices_pending} validatingId={validatingInvId} onValidate={handleValidateInvoice} />
          </CardShell>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <CardShell title="Chantiers score santé < 50">
            <CriticalProjectsTable rows={critical_projects} />
          </CardShell>

          <CardShell title="Stocks en alerte" linkLabel="Voir tous" linkTo="/stocks">
            <StocksTable rows={stock_alerts} />
          </CardShell>
        </div>
      </div>

      {/* ── DQE en attente — full width ── */}
      <CardShell title="DQE en attente de validation" linkLabel="Portfolio DQE" linkTo="/portfolio/dqe" style={{ marginBottom: 16 }}>
        <DqeTable rows={dqe_pending} validatingId={validatingDqeId} onValidate={handleValidateDqe} />
      </CardShell>
    </div>
  );
}
