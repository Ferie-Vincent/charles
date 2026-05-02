import { useQuery } from '@tanstack/react-query';
import { getActivityDetail, type ActivityDetail } from '../api/portfolio-accounting';

interface Props {
  type: string;
  sourceId: number;
  onClose: () => void;
}

const fmtAmount = (n?: number) =>
  n !== undefined && n !== null
    ? new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(n)
    : '—';

const fmtDateLong = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : null;

const fmtDateShort = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) : null;

const URGENCY: Record<string, { label: string; color: string; bg: string }> = {
  faible:   { label: 'Faible',    color: '#64748b', bg: '#f1f5f9' },
  normale:  { label: 'Normale',   color: '#3b82f6', bg: '#eff6ff' },
  haute:    { label: 'Haute',     color: '#f59e0b', bg: '#fffbeb' },
  critique: { label: 'Critique',  color: '#ef4444', bg: '#fef2f2' },
};

const STATUS_INVOICE: Record<string, { label: string; color: string; bg: string }> = {
  brouillon: { label: 'Brouillon', color: '#64748b', bg: '#f1f5f9' },
  soumise:   { label: 'Soumise',   color: '#f59e0b', bg: '#fffbeb' },
  validee:   { label: 'Validée',   color: '#3b82f6', bg: '#eff6ff' },
  payee:     { label: 'Payée',     color: '#16a34a', bg: '#f0fdf4' },
  disputee:  { label: 'Disputée',  color: '#ef4444', bg: '#fef2f2' },
};

const EXPENSE_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  en_attente: { label: 'En attente', color: '#f59e0b', bg: '#fffbeb' },
  approuvee:  { label: 'Approuvée',  color: '#16a34a', bg: '#f0fdf4' },
  rejetee:    { label: 'Rejetée',    color: '#ef4444', bg: '#fef2f2' },
};

const TYPE_META: Record<string, { title: string; badge: string; dotColor: string }> = {
  budget_entry: { title: 'Besoin comptabilisé', badge: 'Paiement direct', dotColor: '#8b5cf6' },
  invoice:      { title: 'Facture fournisseur',  badge: 'Facture',         dotColor: '#3b82f6' },
  expense:      { title: 'Dépense hors projet',  badge: 'Dépense',         dotColor: '#f59e0b' },
};

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === '—') {
    return null;
  }
  return (
    <div className="mr-row">
      <span className="mr-row__label">{label}</span>
      <span className="mr-row__value">{value}</span>
    </div>
  );
}

function Section({ label, dotColor, children }: { label: string; dotColor?: string; children: React.ReactNode }) {
  return (
    <div className="mr-section">
      <div className="mr-section__label">
        {dotColor && <span className="mr-section__label-dot" style={{ background: dotColor }} />}
        {label}
      </div>
      {children}
    </div>
  );
}

function StatusBadge({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <span style={{ background: bg, color, border: `1px solid ${color}30`, borderRadius: 6, padding: '2px 8px', fontSize: '0.78rem', fontWeight: 600 }}>
      {label}
    </span>
  );
}

function TimelineStep({ label, user, date, done, isLast }: {
  label: string; user?: { name: string } | null; date?: string | null; done: boolean; isLast?: boolean;
}) {
  return (
    <div className="mr-timeline__step" style={{ paddingBottom: isLast ? 0 : undefined }}>
      <div className={`mr-timeline__dot ${done ? 'mr-timeline__dot--done' : 'mr-timeline__dot--pending'}`}>
        {done && (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        )}
      </div>
      <div className="mr-timeline__body" style={{ paddingBottom: isLast ? 0 : 16 }}>
        <div className={`mr-timeline__step-label ${done ? '' : 'mr-timeline__step-label--pending'}`}>{label}</div>
        {done && (fmtDateLong(date) || user?.name) && (
          <div className="mr-timeline__step-meta">
            {user?.name && <span style={{ fontWeight: 500, color: 'var(--text-body)' }}>{user.name}</span>}
            {user?.name && date && <span> · </span>}
            {fmtDateLong(date)}
          </div>
        )}
      </div>
    </div>
  );
}

function BudgetEntryContent({ d }: { d: ActivityDetail }) {
  const dem = d.demande;
  const ecart = dem?.estimated_cost && dem?.actual_cost ? dem.actual_cost - dem.estimated_cost : null;

  return (
    <>
      <Section label="Paiement" dotColor="#8b5cf6">
        <Row label="Libellé" value={d.label} />
        <Row label="Catégorie" value={d.category} />
        <Row label="Montant décaissé" value={
          <span className="mr-amount-chip">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            {fmtAmount(d.amount)}
          </span>
        } />
        <Row label="Date d'enregistrement" value={fmtDateShort(d.entry_date)} />
        <Row label="Chantier" value={d.project ? <><span style={{ fontWeight: 700, color: 'var(--accent)' }}>{d.project.code}</span> — {d.project.name}</> : null} />
        <Row label="Enregistré par" value={d.creator?.name} />
        {d.note && d.note !== `Demande de besoin #${dem?.id}` && <Row label="Note" value={d.note} />}
      </Section>

      {dem && (
        <>
          <Section label={`Demande de besoin #${dem.id}`} dotColor="#f97316">
            <Row label="Titre" value={dem.title} />
            {dem.description && <Row label="Description" value={<span style={{ fontStyle: 'italic' }}>{dem.description}</span>} />}
            <Row label="Urgence" value={
              dem.urgency ? <StatusBadge {...(URGENCY[dem.urgency] ?? { label: dem.urgency, color: '#64748b', bg: '#f1f5f9' })} /> : null
            } />
            <Row label="Coût estimé" value={dem.estimated_cost ? fmtAmount(dem.estimated_cost) : null} />
            <Row label="Coût réel" value={dem.actual_cost ? <strong>{fmtAmount(dem.actual_cost)}</strong> : null} />
            {ecart !== null && (
              <Row label="Écart" value={
                <span className={ecart <= 0 ? 'mr-amount-chip--positive' : ''} style={{
                  color: ecart <= 0 ? '#15803d' : '#c2410c',
                  fontWeight: 700, fontSize: '0.85rem',
                }}>
                  {ecart <= 0 ? '−' : '+'}{fmtAmount(Math.abs(ecart))}
                  <span style={{ fontSize: '0.72rem', fontWeight: 400, marginLeft: 4 }}>
                    {ecart <= 0 ? 'sous budget' : 'dépassement'}
                  </span>
                </span>
              } />
            )}
          </Section>

          <Section label="Cycle d'approbation" dotColor="#10b981">
            <div className="mr-timeline">
              <TimelineStep label="Soumise"          user={dem.requester} date={dem.created_at}   done={!!dem.created_at} />
              <TimelineStep label="Approuvée"         user={dem.approver}  date={dem.approved_at}  done={!!dem.approved_at} />
              <TimelineStep label="En préparation"    user={dem.preparer}  date={dem.prepared_at}  done={!!dem.prepared_at} />
              <TimelineStep label="Livrée"            user={undefined}     date={dem.delivered_at} done={!!dem.delivered_at} />
              <TimelineStep label="Comptabilisée"     user={dem.recorder}  date={dem.recorded_at}  done={!!dem.recorded_at} isLast />
            </div>
          </Section>
        </>
      )}
    </>
  );
}

function InvoiceContent({ d }: { d: ActivityDetail }) {
  const st = d.status ? STATUS_INVOICE[d.status] : null;
  return (
    <>
      <Section label="Facture" dotColor="#3b82f6">
        <Row label="Référence" value={<code style={{ fontSize: '0.85rem', color: 'var(--accent)', fontWeight: 700 }}>{d.reference}</code>} />
        <Row label="Fournisseur" value={d.supplier?.name} />
        <Row label="Catégorie" value={d.category} />
        <Row label="Statut" value={st ? <StatusBadge {...st} /> : d.status} />
        <Row label="Montant HT" value={
          <span className="mr-amount-chip mr-amount-chip--neutral">{fmtAmount(d.amount)}</span>
        } />
        {d.amount_ttc && <Row label="Montant TTC" value={fmtAmount(d.amount_ttc)} />}
      </Section>
      <Section label="Dates" dotColor="#64748b">
        <Row label="Date facture" value={fmtDateShort(d.invoice_date)} />
        <Row label="Échéance"     value={fmtDateShort(d.due_date)} />
        {d.paid_date && <Row label="Payée le" value={fmtDateShort(d.paid_date)} />}
      </Section>
      <Section label="Traçabilité" dotColor="#8b5cf6">
        <Row label="Chantier"   value={d.project ? <><span style={{ fontWeight: 700, color: 'var(--accent)' }}>{d.project.code}</span> — {d.project.name}</> : null} />
        <Row label="Créée par"  value={d.creator?.name} />
        {d.note && <Row label="Note" value={d.note} />}
      </Section>
    </>
  );
}

function ExpenseContent({ d }: { d: ActivityDetail }) {
  const st = d.status ? EXPENSE_STATUS[d.status] : null;
  return (
    <>
      <Section label="Dépense" dotColor="#f59e0b">
        <Row label="Libellé"   value={d.label} />
        <Row label="Catégorie" value={d.category} />
        <Row label="Montant"   value={<span className="mr-amount-chip">{fmtAmount(d.amount)}</span>} />
        <Row label="Date"      value={fmtDateShort(d.expense_date)} />
        <Row label="Payé par"  value={d.paid_by} />
        <Row label="Statut"    value={st ? <StatusBadge {...st} /> : d.status} />
      </Section>
      <Section label="Traçabilité" dotColor="#8b5cf6">
        <Row label="Créé par"        value={d.creator?.name} />
        {d.approver && <Row label="Approuvé par" value={d.approver.name} />}
        {d.approved_at && <Row label="Date approbation" value={fmtDateLong(d.approved_at)} />}
        {d.rejection_reason && (
          <Row label="Motif rejet" value={<span style={{ color: 'var(--danger)' }}>{d.rejection_reason}</span>} />
        )}
        {d.notes && <Row label="Notes" value={<span style={{ fontStyle: 'italic' }}>{d.notes}</span>} />}
      </Section>
    </>
  );
}

export default function ActivityDetailModal({ type, sourceId, onClose }: Props) {
  const meta = TYPE_META[type] ?? { title: 'Détail transaction', badge: type, dotColor: '#64748b' };

  const { data, isLoading } = useQuery({
    queryKey: ['activity-detail', type, sourceId],
    queryFn: () => getActivityDetail(type, sourceId),
    enabled: !!sourceId,
  });

  return (
    <div className="mr-modal-overlay" onClick={onClose}>
      <div className="mr-modal" style={{ maxWidth: 600 }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="mr-modal__head">
          <div className="mr-modal__head-left">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{
                background: `${meta.dotColor}15`, color: meta.dotColor,
                border: `1px solid ${meta.dotColor}30`,
                borderRadius: 6, padding: '2px 8px', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.04em',
              }}>
                {meta.badge}
              </span>
            </div>
            <h2 className="mr-modal__title">{meta.title}</h2>
            {data?.project && (
              <p className="mr-modal__sub">{data.project.code} — {data.project.name}</p>
            )}
          </div>
          <button type="button" className="mr-modal__close" onClick={onClose} aria-label="Fermer">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" width="16" height="16">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="mr-modal__body">
          {isLoading ? (
            <>
              <div className="skeleton mr-section" style={{ height: 120, marginBottom: 12 }} />
              <div className="skeleton mr-section" style={{ height: 160 }} />
            </>
          ) : !data ? (
            <p style={{ color: 'var(--danger)', padding: '8px 0' }}>Impossible de charger les détails.</p>
          ) : (
            <>
              {data.type === 'budget_entry' && <BudgetEntryContent d={data} />}
              {data.type === 'invoice'       && <InvoiceContent d={data} />}
              {data.type === 'expense'       && <ExpenseContent d={data} />}
            </>
          )}
        </div>

      </div>
    </div>
  );
}
