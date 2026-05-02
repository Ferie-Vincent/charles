import { useQuery } from '@tanstack/react-query';
import { getActivityDetail, type ActivityDetail } from '../api/portfolio-accounting';

interface Props {
  type: string;
  sourceId: number;
  onClose: () => void;
}

const fmt = (n?: number) =>
  n !== undefined && n !== null
    ? new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(n)
    : '—';

const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

const fmtDateShort = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) : '—';

const URGENCY_LABEL: Record<string, string> = { faible: 'Faible', normale: 'Normale', haute: 'Haute', critique: 'Critique' };
const URGENCY_COLOR: Record<string, string> = { faible: '#94a3b8', normale: '#3b82f6', haute: '#f59e0b', critique: '#ef4444' };

const STATUS_INVOICE: Record<string, { label: string; color: string }> = {
  brouillon: { label: 'Brouillon',  color: '#94a3b8' },
  soumise:   { label: 'Soumise',    color: '#f59e0b' },
  validee:   { label: 'Validée',    color: '#3b82f6' },
  payee:     { label: 'Payée',      color: '#10b981' },
  disputee:  { label: 'Disputée',   color: '#ef4444' },
};

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '8px 0', borderBottom: '1px solid var(--border)', gap: 16 }}>
      <span style={{ color: 'var(--text-muted)', fontSize: '0.83rem', flexShrink: 0 }}>{label}</span>
      <span style={{ fontWeight: 500, fontSize: '0.88rem', color: 'var(--text-body)', textAlign: 'right' }}>{value ?? '—'}</span>
    </div>
  );
}

function TimelineStep({ label, user, date, done }: { label: string; user?: { name: string } | null; date?: string | null; done: boolean }) {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
      <div style={{
        width: 20, height: 20, borderRadius: '50%', flexShrink: 0, marginTop: 2,
        background: done ? '#10b98120' : 'var(--border)',
        border: `2px solid ${done ? '#10b981' : 'var(--border)'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {done && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
      </div>
      <div style={{ flex: 1, paddingBottom: 12 }}>
        <div style={{ fontSize: '0.82rem', fontWeight: 600, color: done ? 'var(--text-body)' : 'var(--text-muted)' }}>{label}</div>
        {done && (
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
            {user?.name && <span>{user.name} · </span>}
            {fmtDate(date)}
          </div>
        )}
      </div>
    </div>
  );
}

function BudgetEntryDetail({ d }: { d: ActivityDetail }) {
  const dem = d.demande;
  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#8b5cf6', letterSpacing: '0.05em', marginBottom: 8, textTransform: 'uppercase' }}>Détails du paiement</div>
        <Row label="Libellé" value={d.label} />
        <Row label="Catégorie" value={d.category} />
        <Row label="Montant décaissé" value={<span style={{ color: 'var(--danger)', fontWeight: 700 }}>{fmt(d.amount)}</span>} />
        <Row label="Date d'enregistrement" value={fmtDateShort(d.entry_date)} />
        <Row label="Chantier" value={d.project ? `${d.project.code} — ${d.project.name}` : '—'} />
        <Row label="Enregistré par" value={d.creator?.name} />
        {d.note && <Row label="Note" value={d.note} />}
      </div>

      {dem && (
        <>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#8b5cf6', letterSpacing: '0.05em', marginBottom: 8, textTransform: 'uppercase' }}>Demande de besoin #{dem.id}</div>
          <Row label="Titre" value={dem.title} />
          {dem.description && <Row label="Description" value={dem.description} />}
          <Row label="Urgence" value={
            <span style={{ color: URGENCY_COLOR[dem.urgency] ?? '#94a3b8', fontWeight: 600 }}>
              {URGENCY_LABEL[dem.urgency] ?? dem.urgency}
            </span>
          } />
          <Row label="Coût estimé" value={fmt(dem.estimated_cost)} />
          <Row label="Coût réel" value={<span style={{ fontWeight: 700 }}>{fmt(dem.actual_cost)}</span>} />
          {dem.estimated_cost && dem.actual_cost && (
            <Row label="Écart estimé/réel" value={
              <span style={{ color: dem.actual_cost <= dem.estimated_cost ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>
                {dem.actual_cost <= dem.estimated_cost ? '−' : '+'}{fmt(Math.abs(dem.actual_cost - dem.estimated_cost))}
              </span>
            } />
          )}

          <div style={{ marginTop: 20, marginBottom: 8 }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: 12, textTransform: 'uppercase' }}>Cycle d'approbation</div>
            <TimelineStep label="Soumise"      user={dem.requester} date={dem.created_at}  done={!!dem.created_at} />
            <TimelineStep label="Approuvée"    user={dem.approver}  date={dem.approved_at} done={!!dem.approved_at} />
            <TimelineStep label="En préparation" user={dem.preparer} date={dem.prepared_at} done={!!dem.prepared_at} />
            <TimelineStep label="Livrée"       user={undefined}     date={dem.delivered_at} done={!!dem.delivered_at} />
            <TimelineStep label="Comptabilisée" user={dem.recorder} date={dem.recorded_at} done={!!dem.recorded_at} />
          </div>
        </>
      )}
    </>
  );
}

function InvoiceDetail({ d }: { d: ActivityDetail }) {
  const st = d.status ? STATUS_INVOICE[d.status] : null;
  return (
    <>
      <Row label="Référence" value={<code style={{ fontSize: '0.85rem', color: 'var(--accent)' }}>{d.reference}</code>} />
      <Row label="Fournisseur" value={d.supplier?.name} />
      <Row label="Catégorie" value={d.category} />
      <Row label="Montant HT" value={<span style={{ fontWeight: 700 }}>{fmt(d.amount)}</span>} />
      {d.amount_ttc && <Row label="Montant TTC" value={fmt(d.amount_ttc)} />}
      <Row label="Statut" value={st ? <span style={{ color: st.color, fontWeight: 600 }}>{st.label}</span> : d.status} />
      <Row label="Date facture" value={fmtDateShort(d.invoice_date)} />
      <Row label="Échéance" value={fmtDateShort(d.due_date)} />
      {d.paid_date && <Row label="Date paiement" value={fmtDateShort(d.paid_date)} />}
      <Row label="Chantier" value={d.project ? `${d.project.code} — ${d.project.name}` : '—'} />
      <Row label="Créée par" value={d.creator?.name} />
      {d.note && <Row label="Note" value={d.note} />}
    </>
  );
}

function ExpenseDetail({ d }: { d: ActivityDetail }) {
  return (
    <>
      <Row label="Libellé" value={d.label} />
      <Row label="Catégorie" value={d.category} />
      <Row label="Montant" value={<span style={{ fontWeight: 700 }}>{fmt(d.amount)}</span>} />
      <Row label="Date" value={fmtDateShort(d.expense_date)} />
      <Row label="Payé par" value={d.paid_by} />
      <Row label="Statut" value={d.status} />
      <Row label="Créé par" value={d.creator?.name} />
      {d.approver && <Row label="Approuvé par" value={d.approver.name} />}
      {d.approved_at && <Row label="Date approbation" value={fmtDate(d.approved_at)} />}
      {d.rejection_reason && <Row label="Motif rejet" value={<span style={{ color: 'var(--danger)' }}>{d.rejection_reason}</span>} />}
      {d.notes && <Row label="Notes" value={d.notes} />}
    </>
  );
}

const TYPE_TITLE: Record<string, string> = {
  budget_entry: 'Détail — Besoin comptabilisé',
  invoice:      'Détail — Facture',
  expense:      'Détail — Dépense hors projet',
};

export default function ActivityDetailModal({ type, sourceId, onClose }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ['activity-detail', type, sourceId],
    queryFn: () => getActivityDetail(type, sourceId),
  });

  return (
    <div className="mr-modal-backdrop" onClick={onClose}>
      <div className="mr-modal" style={{ maxWidth: 520, maxHeight: '85vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <div className="mr-modal__head">
          <h2 className="mr-modal__title">{TYPE_TITLE[type] ?? 'Détail transaction'}</h2>
          <button type="button" className="mr-modal__close" onClick={onClose} aria-label="Fermer">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div style={{ padding: '0 20px 20px' }}>
          {isLoading ? (
            <div className="skeleton skeleton-page__card" style={{ height: 200, marginTop: 16 }} />
          ) : !data ? (
            <p style={{ color: 'var(--danger)', padding: 16 }}>Impossible de charger les détails.</p>
          ) : (
            <>
              {data.type === 'budget_entry' && <BudgetEntryDetail d={data} />}
              {data.type === 'invoice'       && <InvoiceDetail d={data} />}
              {data.type === 'expense'       && <ExpenseDetail d={data} />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
