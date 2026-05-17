import SkeletonPage from '../../../components/ui/SkeletonPage';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../auth/stores/auth-store';
import {
  getStockItems, createStockItem, updateStockItem, deleteStockItem,
  getMovements, addMovement,
  STOCK_CATEGORIES, type StockItem, type StockMovement,
} from '../api/stocks';
import PageHeader from '../../../components/ui/PageHeader';

const fmt = (n: number, unit = '') => `${n % 1 === 0 ? n : n.toFixed(2)}${unit ? ' ' + unit : ''}`;
const fmtDate = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });

const EMPTY_ITEM: Partial<StockItem> = { name: '', category: 'materiaux', unit: 'unité', quantity: 0, threshold: 0, location: '', notes: '' };

const CAT_COLOR: Record<string, string> = {
  materiaux: '#f97316', equipement: '#3b7ddd', fournitures: '#8b5cf6',
  consommables: '#10b981', autre: '#94a3b8',
};

const TERRAIN_ROLES = ['chef-chantier', 'conducteur-travaux'];

export default function StocksPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isTerrain = TERRAIN_ROLES.includes(user?.role?.name ?? '');
  const [search, setSearch]       = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [itemModal, setItemModal] = useState<Partial<StockItem> | null>(null);
  const [deleteId, setDeleteId]   = useState<number | null>(null);
  const [saving, setSaving]       = useState(false);
  const [movModal, setMovModal]   = useState<StockItem | null>(null);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [movForm, setMovForm]     = useState({ type: (isTerrain ? 'sortie' : 'entree') as StockMovement['type'], quantity: 0, reason: '', movement_date: new Date().toISOString().slice(0, 10), notes: '' });

  const { data: items = [], isLoading: loading } = useQuery({
    queryKey: ['stock-items'],
    queryFn: getStockItems,
    staleTime: 60_000,
  });

  const openMovements = async (item: StockItem) => {
    setMovModal(item);
    setMovements(await getMovements(item.id));
  };

  const handleSaveItem = async () => {
    if (!itemModal?.name) return;
    setSaving(true);
    try {
      if (itemModal.id) await updateStockItem(itemModal.id, itemModal);
      else              await createStockItem(itemModal);
      setItemModal(null);
      queryClient.invalidateQueries({ queryKey: ['stock-items'] });
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteStockItem(deleteId);
    setDeleteId(null);
    queryClient.invalidateQueries({ queryKey: ['stock-items'] });
  };

  const handleAddMovement = async () => {
    if (!movModal || !movForm.reason || movForm.quantity <= 0) return;
    setSaving(true);
    try {
      const res = await addMovement(movModal.id, movForm);
      setMovements(prev => [res.movement, ...prev]);
      setMovModal(res.stock);
      setMovForm({ type: 'entree', quantity: 0, reason: '', movement_date: new Date().toISOString().slice(0, 10), notes: '' });
      queryClient.invalidateQueries({ queryKey: ['stock-items'] });
    } finally { setSaving(false); }
  };

  const filtered = items.filter(i => {
    const q = search.toLowerCase();
    return (!q || i.name.toLowerCase().includes(q) || (i.reference ?? '').toLowerCase().includes(q))
      && (!catFilter || i.category === catFilter);
  });

  const criticalItems = items.filter(i => i.is_low);

  const rupture = items.filter(i => (i.quantity ?? 0) === 0).length;
  const ok = items.filter(i => !i.is_low && (i.quantity ?? 0) > 0).length;

  return (
    <div className="page-container">

      <PageHeader
        title="Gestion des Stocks"
        subtitle="Inventaire temps réel — alertes seuil automatiques"
        action={
          <button className="btn-primary" onClick={() => setItemModal({ ...EMPTY_ITEM })}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Nouvel article
          </button>
        }
      />

      {/* KPIs */}
      <div className="proj-kpi-row">
        <div className="proj-kpi">
          <div className="proj-kpi__icon proj-kpi__icon--blue">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
            </svg>
          </div>
          <div className="proj-kpi__body">
            <div className="proj-kpi__value">{items.length}</div>
            <div className="proj-kpi__label">Articles en stock</div>
          </div>
        </div>

        <div className="proj-kpi">
          <div className="proj-kpi__icon proj-kpi__icon--orange">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <div className="proj-kpi__body">
            <div className="proj-kpi__value" style={{ color: criticalItems.length > 0 ? '#ef4444' : undefined }}>{criticalItems.length}</div>
            <div className="proj-kpi__label">Critiques (sous seuil)</div>
          </div>
        </div>

        <div className="proj-kpi">
          <div className="proj-kpi__icon proj-kpi__icon--red" style={{ background: '#ef444420', color: '#ef4444' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </div>
          <div className="proj-kpi__body">
            <div className="proj-kpi__value" style={{ color: rupture > 0 ? '#ef4444' : undefined }}>{rupture}</div>
            <div className="proj-kpi__label">En rupture</div>
          </div>
        </div>

        <div className="proj-kpi">
          <div className="proj-kpi__icon proj-kpi__icon--green">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <div className="proj-kpi__body">
            <div className="proj-kpi__value" style={{ color: '#10b981' }}>{ok}</div>
            <div className="proj-kpi__label">Niveaux OK</div>
          </div>
        </div>
      </div>

      {/* Alerte critique */}
      {criticalItems.length > 0 && (
        <div className="acct-pending-banner">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          <strong>{criticalItems.length} article{criticalItems.length > 1 ? 's' : ''} en dessous du seuil</strong>
          <span>— {criticalItems.map(i => i.name).join(', ')}</span>
        </div>
      )}

      {/* Panneau tableau */}
      <div className="bg-panel" style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        {/* Barre d'outils */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '14px 18px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
          <div className="acct-search-wrap" style={{ flex: 1, minWidth: 200, maxWidth: 340 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14" className="acct-search-icon"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" className="acct-search-input" placeholder="Rechercher un article…" value={search} onChange={e => setSearch(e.target.value)} />
            {search && <button className="acct-search-clear" onClick={() => setSearch('')}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="12" height="12"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button className={`bud-tab ${!catFilter ? 'bud-tab--active' : ''}`} onClick={() => setCatFilter('')}>Tous <span className="dqe-filter-count">{items.length}</span></button>
            {Object.entries(STOCK_CATEGORIES).map(([k, v]) => {
              const count = items.filter(i => i.category === k).length;
              if (!count) return null;
              return <button key={k} className={`bud-tab ${catFilter === k ? 'bud-tab--active' : ''}`} onClick={() => setCatFilter(k === catFilter ? '' : k)}>{v} <span className="dqe-filter-count">{count}</span></button>;
            })}
          </div>
        </div>

        {/* Tableau */}
        {loading ? <SkeletonPage rows={2} /> : (
          <table className="data-table stocks-table">
            <thead>
              <tr>
                <th>Article</th>
                <th>Catégorie</th>
                <th>Niveau de stock</th>
                <th style={{ textAlign: 'right' }}>Quantité</th>
                <th>Statut</th>
                <th style={{ textAlign: 'right' }}>Mouvements</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && <tr><td colSpan={7} className="acct-empty">Aucun article trouvé</td></tr>}
              {filtered.map(item => {
                const cc = CAT_COLOR[item.category] ?? '#94a3b8';
                const isLow = item.is_low;
                const isEmpty = item.quantity === 0;
                const pct = item.threshold > 0
                  ? Math.min(100, Math.round((item.quantity / item.threshold) * 100))
                  : null;
                const barColor = isEmpty ? '#ef4444' : isLow ? '#f59e0b' : '#10b981';
                return (
                  <tr key={item.id} className={isEmpty ? 'stocks-row--empty' : isLow ? 'stocks-row--low' : ''}>
                    <td>
                      <span style={{ fontWeight: 600, color: 'var(--text-body)' }}>{item.name}</span>
                      {(item.reference || item.location) && (
                        <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {item.reference && <span>Réf : {item.reference}</span>}
                          {item.reference && item.location && ' · '}
                          {item.location && <span>{item.location}</span>}
                        </p>
                      )}
                    </td>
                    <td>
                      <span className="badge" style={{ background: `${cc}12`, color: cc, borderColor: `${cc}35` }}>
                        {STOCK_CATEGORIES[item.category]}
                      </span>
                    </td>
                    <td style={{ minWidth: 140 }}>
                      {pct !== null ? (
                        <div className="stocks-gauge">
                          <div className="stocks-gauge__track">
                            <div className="stocks-gauge__fill" style={{ width: `${Math.min(pct, 100)}%`, background: barColor }} />
                          </div>
                          <span className="stocks-gauge__pct" style={{ color: barColor }}>{pct}%</span>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>Pas de seuil</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.95rem', color: isEmpty ? '#ef4444' : isLow ? '#f59e0b' : 'var(--text-body)' }}>
                        {fmt(item.quantity, item.unit)}
                      </span>
                      {item.threshold > 0 && (
                        <p style={{ margin: '1px 0 0', fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'right' }}>
                          seuil : {fmt(item.threshold, item.unit)}
                        </p>
                      )}
                    </td>
                    <td>
                      {isEmpty ? (
                        <span className="badge badge--danger">Rupture</span>
                      ) : isLow ? (
                        <span className="badge badge--warning">Critique</span>
                      ) : (
                        <span className="badge badge--success">OK</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                      {item.movements_count ?? 0}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button className="btn btn--sm btn--secondary" onClick={() => openMovements(item)} title="Enregistrer un mouvement">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="12" height="12"><path d="M8 7h12M8 12h12M8 17h12M3 7h.01M3 12h.01M3 17h.01"/></svg>
                          Mouvement
                        </button>
                        <button className="btn-icon btn-icon--edit" onClick={() => setItemModal({ ...item })} title="Modifier">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="13" height="13"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        <button className="btn-icon btn-icon--delete" onClick={() => setDeleteId(item.id)} title="Supprimer">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="13" height="13"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modale élément */}
      {itemModal !== null && (
        <div className="mr-modal-overlay" onClick={() => setItemModal(null)}>
          <div className="mr-modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
            <div className="mr-modal__head">
              <h2 className="mr-modal__title">{itemModal.id ? 'Modifier l\'article' : 'Nouvel article'}</h2>
              <button className="mr-modal__close" aria-label="Fermer" onClick={() => setItemModal(null)}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
            </div>
            <div className="mr-modal__body" style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-field" style={{ gridColumn: '1/-1' }}>
                  <label className="form-label">Nom *</label>
                  <input className="form-input" value={itemModal.name ?? ''} onChange={e => setItemModal({ ...itemModal, name: e.target.value })} placeholder="ex: Ciment CPA 42.5" />
                </div>
                <div className="form-field">
                  <label className="form-label">Catégorie *</label>
                  <select className="form-select" value={itemModal.category ?? 'materiaux'} onChange={e => setItemModal({ ...itemModal, category: e.target.value })}>
                    {Object.entries(STOCK_CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div className="form-field">
                  <label className="form-label">Unité *</label>
                  <input className="form-input" value={itemModal.unit ?? ''} onChange={e => setItemModal({ ...itemModal, unit: e.target.value })} placeholder="sac, m², kg, unité…" />
                </div>
                <div className="form-field">
                  <label className="form-label">Quantité initiale</label>
                  <input className="form-input" type="number" min={0} value={itemModal.quantity ?? 0} onChange={e => setItemModal({ ...itemModal, quantity: parseFloat(e.target.value) || 0 })} />
                </div>
                <div className="form-field">
                  <label className="form-label">Seuil alerte</label>
                  <input className="form-input" type="number" min={0} value={itemModal.threshold ?? 0} onChange={e => setItemModal({ ...itemModal, threshold: parseFloat(e.target.value) || 0 })} />
                </div>
                <div className="form-field">
                  <label className="form-label">Référence</label>
                  <input className="form-input" value={itemModal.reference ?? ''} onChange={e => setItemModal({ ...itemModal, reference: e.target.value })} placeholder="Code interne" />
                </div>
                <div className="form-field">
                  <label className="form-label">Emplacement</label>
                  <input className="form-input" value={itemModal.location ?? ''} onChange={e => setItemModal({ ...itemModal, location: e.target.value })} placeholder="Magasin, rack, zone…" />
                </div>
                <div className="form-field" style={{ gridColumn: '1/-1' }}>
                  <label className="form-label">Notes</label>
                  <textarea className="form-textarea" rows={2} value={itemModal.notes ?? ''} onChange={e => setItemModal({ ...itemModal, notes: e.target.value })} />
                </div>
              </div>
            </div>
            <div className="mr-modal__actions">
              <button className="btn btn--secondary" onClick={() => setItemModal(null)}>Annuler</button>
              <button className="btn btn--primary" onClick={handleSaveItem} disabled={saving || !itemModal.name}>{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Panneau mouvements */}
      {movModal !== null && (
        <div className="mr-modal-overlay" onClick={() => setMovModal(null)}>
          <div className="mr-modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
            <div className="mr-modal__head">
              <div>
                <h2 className="mr-modal__title">Mouvements — {movModal.name}</h2>
                <p className="mr-modal__sub" style={{ marginTop: 2, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  Stock actuel : <strong style={{ color: movModal.is_low ? '#ef4444' : '#10b981' }}>{fmt(movModal.quantity, movModal.unit)}</strong>
                </p>
              </div>
              <button className="mr-modal__close" aria-label="Fermer" onClick={() => setMovModal(null)}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
            </div>
            <div className="mr-modal__body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Formulaire nouveau mouvement */}
              <div className="stocks-mov-form">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                  <div className="form-field">
                    <label className="form-label">Type</label>
                    <select className="form-select" value={movForm.type} onChange={e => setMovForm({ ...movForm, type: e.target.value as StockMovement['type'] })}>
                      {!isTerrain && <option value="entree">Entrée (+)</option>}
                      <option value="sortie">Sortie (−)</option>
                      {!isTerrain && <option value="ajustement">Ajustement</option>}
                    </select>
                  </div>
                  <div className="form-field">
                    <label className="form-label">Quantité *</label>
                    <input className="form-input" type="number" min={0.01} step="0.01" value={movForm.quantity || ''} onChange={e => setMovForm({ ...movForm, quantity: parseFloat(e.target.value) || 0 })} />
                  </div>
                  <div className="form-field">
                    <label className="form-label">Date *</label>
                    <input className="form-input" type="date" value={movForm.movement_date} onChange={e => setMovForm({ ...movForm, movement_date: e.target.value })} />
                  </div>
                </div>
                <div className="form-field">
                  <label className="form-label">Motif *</label>
                  <input className="form-input" value={movForm.reason} onChange={e => setMovForm({ ...movForm, reason: e.target.value })} placeholder="ex: Livraison chantier Cocody, Inventaire mensuel…" />
                </div>
                <button className="btn btn--primary btn--sm" style={{ alignSelf: 'flex-end' }} onClick={handleAddMovement} disabled={saving || !movForm.reason || movForm.quantity <= 0}>
                  {saving ? '…' : 'Enregistrer mouvement'}
                </button>
              </div>
              {/* Historique */}
              <div>
                <p className="form-label" style={{ marginBottom: 8 }}>Historique</p>
                {movements.length === 0 ? (
                  <p className="acct-empty">Aucun mouvement enregistré</p>
                ) : (
                  <div className="stocks-mov-list">
                    {movements.map(m => {
                      const isIn = m.type === 'entree';
                      const isAdj = m.type === 'ajustement';
                      return (
                        <div key={m.id} className="stocks-mov-row">
                          <span className={`stocks-mov-type ${isAdj ? 'stocks-mov-type--adj' : isIn ? 'stocks-mov-type--in' : 'stocks-mov-type--out'}`}>
                            {isAdj ? '↕' : isIn ? '+' : '−'}
                          </span>
                          <div className="stocks-mov-info">
                            <span className="stocks-mov-reason">{m.reason}</span>
                            <span className="stocks-mov-meta">{fmtDate(m.movement_date)} · {m.creator?.name ?? '—'}{m.project ? ` · ${m.project.code}` : ''}</span>
                          </div>
                          <span className={`stocks-mov-qty ${isIn ? 'stocks-mov-qty--in' : isAdj ? '' : 'stocks-mov-qty--out'}`}>
                            {isAdj ? fmt(m.quantity, movModal.unit) : `${isIn ? '+' : '−'}${fmt(m.quantity, movModal.unit)}`}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Supprimer */}
      {deleteId !== null && (
        <div className="mr-modal-overlay" onClick={() => setDeleteId(null)}>
          <div className="mr-modal" style={{ maxWidth: 380 }} onClick={e => e.stopPropagation()}>
            <div className="mr-modal__head"><h2 className="mr-modal__title">Supprimer cet article ?</h2><button className="mr-modal__close" aria-label="Fermer" onClick={() => setDeleteId(null)}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>
            <div className="mr-modal__body"><p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Cette action est irréversible. La suppression sera bloquée si l'article a des mouvements enregistrés.</p></div>
            <div className="mr-modal__actions">
              <button className="btn btn--secondary" onClick={() => setDeleteId(null)}>Annuler</button>
              <button className="btn btn--danger" onClick={handleDelete}>Supprimer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
