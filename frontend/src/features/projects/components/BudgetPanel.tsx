import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import {
  getBudget, createBudgetEntry, deleteBudgetEntry,
  type BudgetData, type BudgetEntryInput, type BudgetEntryType,
} from '../api/get-budget';

// Catégories budget BTP — alignées SYSCOHADA-CI (plan comptable OHADA classe 6)
const CATEGORIES = [
  'Installation de chantier',
  'Terrassement & fondations',
  'Gros œuvre',
  'Charpente & toiture',
  'Menuiseries',
  'Plomberie & sanitaire',
  'Électricité & CVC',
  'Revêtements & finitions',
  'VRD & espaces extérieurs',
  "Main d'œuvre directe",
  'Sous-traitance',
  'Matériaux',
  'Matériel et outillage',
  'Transport et déplacement',
  'Études et honoraires',
  'Sécurité et EPI',
  'Assurances chantier',
  'Impôts et taxes',
  'Frais généraux chantier',
  'Autre',
];

const TYPE_LABELS: Record<BudgetEntryType, string> = {
  previsionnel: 'Prévisionnel',
  engagement:   'Engagement',
  paiement:     'Paiement',
};

const TYPE_COLORS: Record<BudgetEntryType, string> = {
  previsionnel: '#3b82f6',
  engagement:   '#f59e0b',
  paiement:     '#10b981',
};

function fmtFCFA(n: number): string {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toLocaleString('fr-FR', { maximumFractionDigits: 2 }) + ' Mds';
  if (n >= 1_000_000)     return (n / 1_000_000).toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' M';
  return n.toLocaleString('fr-FR') + ' FCFA';
}

function fmtFCFAFull(n: number): string {
  return Number(n).toLocaleString('fr-FR') + ' FCFA';
}

const EMPTY_FORM: BudgetEntryInput = {
  type: 'previsionnel',
  category: '',
  label: '',
  amount: 0,
  entry_date: new Date().toISOString().split('T')[0],
  note: '',
};

type Props = { projectId: number };

export default function BudgetPanel({ projectId }: Props) {
  const [data, setData]       = useState<BudgetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [form, setForm]       = useState<BudgetEntryInput>(EMPTY_FORM);
  const [activeTab, setActiveTab] = useState<BudgetEntryType | 'all'>('all');

  useEffect(() => {
    getBudget(projectId).then(setData).finally(() => setLoading(false));
  }, [projectId]);

  function set(field: keyof BudgetEntryInput, value: string | number) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.category || !form.label || form.amount <= 0) return;
    setSaving(true);
    try {
      await createBudgetEntry(projectId, form);
      const fresh = await getBudget(projectId);
      setData(fresh);
      setForm(EMPTY_FORM);
      setShowForm(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    await deleteBudgetEntry(projectId, id);
    const fresh = await getBudget(projectId);
    setData(fresh);
  }

  if (loading) return <p className="bud-empty">Chargement…</p>;
  if (!data)   return <p className="bud-empty">Erreur de chargement.</p>;

  const { totals, chart, entries } = data;
  const filtered = activeTab === 'all' ? entries : entries.filter(e => e.type === activeTab);

  const engagePct = totals.previsionnel > 0
    ? Math.min(100, (totals.engagement / totals.previsionnel) * 100)
    : 0;
  const payePct = totals.previsionnel > 0
    ? Math.min(100, (totals.paiement / totals.previsionnel) * 100)
    : 0;

  return (
    <div className="bud-panel">

      {/* KPI row */}
      <div className="bud-kpi-row">
        <div className="bud-kpi">
          <span className="bud-kpi__label">Budget prévisionnel</span>
          <span className="bud-kpi__value" style={{ color: '#3b82f6' }}>{fmtFCFA(totals.previsionnel)} FCFA</span>
        </div>
        <div className="bud-kpi">
          <span className="bud-kpi__label">Engagé</span>
          <span className="bud-kpi__value" style={{ color: '#f59e0b' }}>{fmtFCFA(totals.engagement)} FCFA</span>
          <div className="bud-kpi__bar"><div className="bud-kpi__fill" style={{ width: `${engagePct}%`, background: '#f59e0b' }} /></div>
          <span className="bud-kpi__pct">{totals.taux_engagement}%</span>
        </div>
        <div className="bud-kpi">
          <span className="bud-kpi__label">Décaissé</span>
          <span className="bud-kpi__value" style={{ color: '#10b981' }}>{fmtFCFA(totals.paiement)} FCFA</span>
          <div className="bud-kpi__bar"><div className="bud-kpi__fill" style={{ width: `${payePct}%`, background: '#10b981' }} /></div>
          <span className="bud-kpi__pct">{payePct.toFixed(1)}%</span>
        </div>
        <div className="bud-kpi bud-kpi--solde">
          <span className="bud-kpi__label">Solde disponible</span>
          <span className="bud-kpi__value" style={{ color: totals.solde >= 0 ? '#10b981' : '#ef4444' }}>
            {fmtFCFA(totals.solde)} FCFA
          </span>
        </div>
      </div>

      {/* 90j chart */}
      {chart.length > 0 && (
        <div className="bud-chart-wrap">
          <p className="bud-chart-title">Prévision décaissements — 90 jours</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chart} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
                axisLine={false} tickLine={false}
                tickFormatter={v => fmtFCFA(v)}
                width={60}
              />
              <Tooltip
                formatter={((v: number, name: string) => [fmtFCFAFull(v), name]) as any}
                contentStyle={{ fontSize: 11, borderRadius: 6, border: '1px solid var(--border)' }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="previsionnel" name="Prévisionnel" fill="#3b82f6" radius={[3, 3, 0, 0]} />
              <Bar dataKey="engagement"   name="Engagement"   fill="#f59e0b" radius={[3, 3, 0, 0]} />
              <Bar dataKey="paiement"     name="Paiement"     fill="#10b981" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Header + form toggle */}
      <div className="bud-list-header">
        <div className="bud-tabs">
          {(['all', 'previsionnel', 'engagement', 'paiement'] as const).map(tab => (
            <button
              key={tab}
              className={`bud-tab ${activeTab === tab ? 'bud-tab--active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab === 'all' ? `Toutes (${entries.length})` : `${TYPE_LABELS[tab]} (${entries.filter(e => e.type === tab).length})`}
            </button>
          ))}
        </div>
        <button className="inc-btn inc-btn--primary" onClick={() => setShowForm(v => !v)}>
          {showForm ? 'Annuler' : '+ Ajouter'}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <form className="bud-form" onSubmit={handleSubmit}>
          <div className="bud-form__row">
            <div className="inc-form__field">
              <label>Type *</label>
              <select value={form.type} onChange={e => set('type', e.target.value)} required>
                <option value="previsionnel">Prévisionnel</option>
                <option value="engagement">Engagement</option>
                <option value="paiement">Paiement</option>
              </select>
            </div>
            <div className="inc-form__field">
              <label>Catégorie *</label>
              <select value={form.category} onChange={e => set('category', e.target.value)} required>
                <option value="">— Sélectionner —</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="inc-form__field">
              <label>Date *</label>
              <input type="date" value={form.entry_date} onChange={e => set('entry_date', e.target.value)} required />
            </div>
          </div>
          <div className="bud-form__row">
            <div className="inc-form__field" style={{ flex: 2 }}>
              <label>Libellé *</label>
              <input type="text" value={form.label} onChange={e => set('label', e.target.value)} required placeholder="Description de la ligne…" />
            </div>
            <div className="inc-form__field">
              <label>Montant (FCFA) *</label>
              <input type="number" min="0" value={form.amount || ''} onChange={e => set('amount', Number(e.target.value))} required placeholder="0" />
            </div>
          </div>
          <div className="inc-form__field">
            <label>Note</label>
            <input type="text" value={form.note} onChange={e => set('note', e.target.value)} placeholder="Optionnel…" />
          </div>
          <div className="inc-form__actions">
            <button type="submit" className="inc-btn inc-btn--primary" disabled={saving}>
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
            <button type="button" className="inc-btn" onClick={() => setShowForm(false)}>Annuler</button>
          </div>
        </form>
      )}

      {/* Entries list */}
      {filtered.length === 0 ? (
        <p className="bud-empty">Aucune entrée{activeTab !== 'all' ? ' pour ce type' : ''}.</p>
      ) : (
        <div className="bud-list">
          {filtered.map(entry => (
            <div key={entry.id} className={`bud-row bud-row--${entry.type}`}>
              <span className={`bud-type-dot`} style={{ background: TYPE_COLORS[entry.type] }} />
              <span className="bud-row__date">{new Date(entry.entry_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}</span>
              <span className={`bud-badge bud-badge--${entry.type}`}>{entry.category}</span>
              <span className="bud-row__label">{entry.label}</span>
              {entry.situation_travaux && (
                <Link
                  to={`/projects/${entry.project_id}/situations`}
                  className="bud-row__source"
                  title="Voir la situation de travaux"
                  onClick={e => e.stopPropagation()}
                >
                  ↗ {entry.situation_travaux.numero}
                </Link>
              )}
              {entry.note && <span className="bud-row__note">{entry.note}</span>}
              <span className="bud-row__amount" style={{ color: TYPE_COLORS[entry.type] }}>
                {Number(entry.amount).toLocaleString('fr-FR')} FCFA
              </span>
              <button className="bud-del" onClick={() => handleDelete(entry.id)} title="Supprimer">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="12" height="12">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                  <path d="M10 11v6"/><path d="M14 11v6"/>
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
