import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getPortfolioAccounting,
  createExpense,
  updateExpense,
  deleteExpense,
  type PortfolioAccounting,
  type GeneralExpense,
} from '../api/portfolio-accounting';

const fmt = (n: number) =>
  n >= 1_000_000
    ? `${(n / 1_000_000).toFixed(1)} M FCFA`
    : n >= 1_000
    ? `${(n / 1_000).toFixed(0)} k FCFA`
    : `${n.toFixed(0)} FCFA`;

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });

const STATUS_LABEL: Record<string, string> = {
  brouillon: 'Brouillon',
  soumise:   'Soumise',
  validee:   'Validée',
  payee:     'Payée',
  disputee:  'Disputée',
};
const STATUS_COLOR: Record<string, string> = {
  brouillon: '#94a3b8',
  soumise:   '#f59e0b',
  validee:   '#3b7ddd',
  payee:     '#10b981',
  disputee:  '#ef4444',
};
const PROJECT_STATUS_COLOR: Record<string, string> = {
  en_cours:  '#10b981',
  planifie:  '#3b7ddd',
  termine:   '#94a3b8',
  suspendu:  '#f59e0b',
};
const PROJECT_STATUS_LABEL: Record<string, string> = {
  en_cours:  'En cours',
  planifie:  'Planifié',
  termine:   'Terminé',
  suspendu:  'Suspendu',
};

const EXPENSE_CATEGORIES: Record<string, string> = {
  transport:     'Transport',
  hebergement:   'Hébergement',
  restauration:  'Restauration',
  fournitures:   'Fournitures',
  communication: 'Communication',
  salaires:      'Salaires',
  charges:       'Charges',
  autre:         'Autre',
};

const EMPTY_EXPENSE = { category: 'transport', label: '', amount: 0, expense_date: new Date().toISOString().slice(0, 10), paid_by: '', notes: '' };

export default function AccountingDashboardPage() {
  const [data, setData]         = useState<PortfolioAccounting | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [modal, setModal]       = useState<Partial<GeneralExpense> | null>(null);
  const [saving, setSaving]     = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const load = () => {
    setLoading(true);
    getPortfolioAccounting()
      .then(setData)
      .catch(() => setError('Impossible de charger les données comptables.'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleSaveExpense = async () => {
    if (!modal) return;
    setSaving(true);
    try {
      if (modal.id) {
        await updateExpense(modal.id, modal);
      } else {
        await createExpense(modal);
      }
      setModal(null);
      load();
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteExpense = async () => {
    if (!deleteId) return;
    await deleteExpense(deleteId);
    setDeleteId(null);
    load();
  };

  if (loading) return <div className="page-content"><p>Chargement…</p></div>;
  if (error || !data) return <div className="page-content"><p className="form-error">{error ?? 'Erreur.'}</p></div>;

  const { totals, projects, recent_activity, expenses } = data;

  return (
    <div className="acct-dash">

      {/* ── Header ── */}
      <div className="acct-dash__header">
        <div>
          <p className="acct-dash__label">COMPTABILITÉ</p>
          <h1 className="acct-dash__title">Vue 360° des finances</h1>
          <p className="acct-dash__sub">Engagements · Réalisé · Reste à consommer · Décaissements</p>
        </div>
        <button className="btn btn--primary" onClick={() => setModal({ ...EMPTY_EXPENSE })}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Décaissement hors projet
        </button>
      </div>

      {/* ── KPI row ── */}
      <div className="acct-kpi-row">
        <div className="acct-kpi acct-kpi--blue">
          <span className="acct-kpi__label">Budget de référence</span>
          <span className="acct-kpi__value">{fmt(totals.budget_ref)}</span>
          <span className="acct-kpi__sub">Référence globale portefeuille</span>
        </div>
        <div className="acct-kpi acct-kpi--orange">
          <span className="acct-kpi__label">Engagements</span>
          <span className="acct-kpi__value">{fmt(totals.engage)}</span>
          <span className="acct-kpi__sub">{totals.taux_engage}% du budget</span>
        </div>
        <div className="acct-kpi acct-kpi--green">
          <span className="acct-kpi__label">Réalisé</span>
          <span className="acct-kpi__value">{fmt(totals.realise)}</span>
          <span className="acct-kpi__sub">{totals.taux_realise}% du budget</span>
        </div>
        <div className="acct-kpi acct-kpi--neutral">
          <span className="acct-kpi__label">Reste à consommer</span>
          <span className="acct-kpi__value">{fmt(totals.rac)}</span>
          <span className="acct-kpi__sub">RAC estimé</span>
        </div>
        <div className={`acct-kpi ${totals.ecart >= 0 ? 'acct-kpi--green' : 'acct-kpi--red'}`}>
          <span className="acct-kpi__label">Coût à terminaison</span>
          <span className="acct-kpi__value">{fmt(totals.cat)}</span>
          <span className="acct-kpi__sub" style={{ color: totals.ecart >= 0 ? '#10b981' : '#ef4444' }}>
            Écart {totals.ecart >= 0 ? '+' : ''}{fmt(totals.ecart)}
          </span>
        </div>
      </div>

      {/* ── Main body: activity + projects ── */}
      <div className="acct-body">

        {/* Activity feed */}
        <div className="acct-panel">
          <div className="acct-panel__head">
            <h2 className="acct-panel__title">Activité récente</h2>
            <span className="acct-panel__count">{recent_activity.length} opérations</span>
          </div>
          <div className="acct-feed">
            {recent_activity.length === 0 && (
              <p className="acct-empty">Aucune opération enregistrée</p>
            )}
            {recent_activity.map((item) => (
              <div key={item.id} className="acct-feed__row">
                <div className={`acct-feed__icon ${item.type === 'invoice' ? 'acct-feed__icon--inv' : 'acct-feed__icon--exp'}`}>
                  {item.type === 'invoice' ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                  )}
                </div>
                <div className="acct-feed__info">
                  <span className="acct-feed__ref">
                    {item.reference ?? item.label}
                  </span>
                  <span className="acct-feed__meta">
                    {item.project_name
                      ? <Link to={`/projects/${item.project_id}/accounting`} className="acct-feed__link">{item.project_code}</Link>
                      : <span className="acct-feed__hors">Hors projet</span>
                    }
                    · {EXPENSE_CATEGORIES[item.category] ?? item.category}
                  </span>
                </div>
                <div className="acct-feed__right">
                  <span className="acct-feed__amount">{fmt(item.amount)}</span>
                  {item.status ? (
                    <span className="acct-feed__badge" style={{ background: `${STATUS_COLOR[item.status]}18`, color: STATUS_COLOR[item.status] }}>
                      {STATUS_LABEL[item.status] ?? item.status}
                    </span>
                  ) : (
                    <span className="acct-feed__date">{fmtDate(item.date)}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Project cards */}
        <div className="acct-projects">
          <div className="acct-panel__head">
            <h2 className="acct-panel__title">Chantiers</h2>
            <span className="acct-panel__count">{projects.length} chantiers</span>
          </div>
          <div className="acct-project-list">
            {projects.map((p) => {
              const barRealise = Math.min(100, p.taux_realise);
              const barEngage  = Math.min(100 - barRealise, p.taux_engage);
              const statusColor = PROJECT_STATUS_COLOR[p.status] ?? '#94a3b8';
              return (
                <Link key={p.id} to={`/projects/${p.id}/accounting`} className="acct-proj-card">
                  <div className="acct-proj-card__top">
                    <div>
                      <span className="acct-proj-card__code">{p.code}</span>
                      <span
                        className="acct-proj-card__status"
                        style={{ background: `${statusColor}18`, color: statusColor }}
                      >
                        {PROJECT_STATUS_LABEL[p.status] ?? p.status}
                      </span>
                    </div>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14" style={{ color: 'var(--text-muted)' }}><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                  </div>
                  <p className="acct-proj-card__name">{p.name}</p>
                  <div className="acct-proj-card__bar-track">
                    <div className="acct-proj-card__bar-realise" style={{ width: `${barRealise}%` }} />
                    <div className="acct-proj-card__bar-engage"  style={{ width: `${barEngage}%` }} />
                  </div>
                  <div className="acct-proj-card__stats">
                    <div>
                      <span className="acct-proj-stat__label">Budget ref</span>
                      <span className="acct-proj-stat__val">{fmt(p.budget_ref)}</span>
                    </div>
                    <div>
                      <span className="acct-proj-stat__label">Réalisé</span>
                      <span className="acct-proj-stat__val">{fmt(p.realise)}</span>
                    </div>
                    <div>
                      <span className="acct-proj-stat__label">Écart</span>
                      <span className="acct-proj-stat__val" style={{ color: p.ecart >= 0 ? '#10b981' : '#ef4444' }}>
                        {p.ecart >= 0 ? '+' : ''}{fmt(p.ecart)}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── General expenses ── */}
      <div className="acct-panel acct-panel--full">
        <div className="acct-panel__head">
          <div>
            <h2 className="acct-panel__title">Décaissements hors projet</h2>
            <p className="acct-panel__desc">Frais généraux non rattachés à un chantier spécifique</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span className="acct-panel__count">
              Total : <strong>{fmt(expenses.reduce((s, e) => s + e.amount, 0))}</strong>
            </span>
            <button className="btn btn--sm btn--primary" onClick={() => setModal({ ...EMPTY_EXPENSE })}>
              + Ajouter
            </button>
          </div>
        </div>
        <div className="acct-table-wrap">
          <table className="acct-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Catégorie</th>
                <th>Libellé</th>
                <th>Payé par</th>
                <th>Montant</th>
                <th>Notes</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {expenses.length === 0 && (
                <tr><td colSpan={7} className="acct-empty">Aucun décaissement hors projet</td></tr>
              )}
              {expenses.map((exp) => (
                <tr key={exp.id}>
                  <td>{fmtDate(exp.expense_date)}</td>
                  <td><span className="badge badge--neutral">{EXPENSE_CATEGORIES[exp.category] ?? exp.category}</span></td>
                  <td>{exp.label}</td>
                  <td>{exp.paid_by ?? '—'}</td>
                  <td><strong>{fmt(exp.amount)}</strong></td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{exp.notes ?? '—'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button className="btn-icon btn-icon--edit" onClick={() => setModal({ ...exp })}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="13" height="13"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      <button className="btn-icon btn-icon--delete" onClick={() => setDeleteId(exp.id)}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="13" height="13"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Expense modal ── */}
      {modal !== null && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h3>{modal.id ? 'Modifier le décaissement' : 'Nouveau décaissement hors projet'}</h3>
              <button className="modal__close" onClick={() => setModal(null)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="modal__body">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Date *</label>
                  <input
                    type="date"
                    className="form-control"
                    value={modal.expense_date ?? ''}
                    onChange={(e) => setModal({ ...modal, expense_date: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Catégorie *</label>
                  <select
                    className="form-control"
                    value={modal.category ?? 'transport'}
                    onChange={(e) => setModal({ ...modal, category: e.target.value })}
                  >
                    {Object.entries(EXPENSE_CATEGORIES).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Libellé *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="ex: Transport DT vers plateau"
                  value={modal.label ?? ''}
                  onChange={(e) => setModal({ ...modal, label: e.target.value })}
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Montant (FCFA) *</label>
                  <input
                    type="number"
                    className="form-control"
                    min={0}
                    value={modal.amount ?? ''}
                    onChange={(e) => setModal({ ...modal, amount: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Payé par</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="ex: DT Charles"
                    value={modal.paid_by ?? ''}
                    onChange={(e) => setModal({ ...modal, paid_by: e.target.value })}
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Notes</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Détails supplémentaires…"
                  value={modal.notes ?? ''}
                  onChange={(e) => setModal({ ...modal, notes: e.target.value })}
                />
              </div>
            </div>
            <div className="modal__footer">
              <button className="btn btn--ghost" onClick={() => setModal(null)}>Annuler</button>
              <button className="btn btn--primary" onClick={handleSaveExpense} disabled={saving || !modal.label || !modal.amount}>
                {saving ? 'Enregistrement…' : modal.id ? 'Modifier' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete confirmation ── */}
      {deleteId !== null && (
        <div className="modal-overlay" onClick={() => setDeleteId(null)}>
          <div className="modal modal--sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h3>Supprimer ce décaissement ?</h3>
            </div>
            <div className="modal__body">
              <p style={{ color: 'var(--text-secondary)' }}>Cette action est irréversible.</p>
            </div>
            <div className="modal__footer">
              <button className="btn btn--ghost" onClick={() => setDeleteId(null)}>Annuler</button>
              <button className="btn btn--danger" onClick={handleDeleteExpense}>Supprimer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
