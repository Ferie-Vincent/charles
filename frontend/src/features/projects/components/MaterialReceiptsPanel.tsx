import { useState, useEffect } from 'react';
import { getMaterialReceipts, type MaterialReceiptsData, type MaterialReconciliation } from '../api/get-material-receipts';

const RECON_LABEL: Record<MaterialReconciliation['status'], { label: string; color: string; hint: string }> = {
  ok:           { label: 'Cohérent',          color: '#10b981', hint: 'Écart ≤ 5 %' },
  ecart:        { label: 'Écart',             color: '#ef4444', hint: 'Journal et magasin divergent — vérifier coulage ou saisie' },
  journal_only: { label: 'Reçu hors magasin', color: '#f59e0b', hint: 'Déclaré reçu sur site sans sortie du stock central (achat direct ?)' },
  stock_only:   { label: 'Sorti non déclaré', color: '#ef4444', hint: 'Sorti du magasin vers ce chantier mais jamais déclaré reçu dans le journal' },
};

const MATERIAL_ICONS: Record<string, string> = {
  'Ciment':    '🪨', 'Fer':      '🔩', 'Sable':    '🏖️',
  'Gravier':   '🪨', 'Briques':  '🧱', 'Bois':     '🪵',
  'Carrelage': '⬛', 'Peinture': '🎨', 'Autre':    '📦',
};

type Props = { projectId: number };

export default function MaterialReceiptsPanel({ projectId }: Props) {
  const [data, setData] = useState<MaterialReceiptsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    getMaterialReceipts(projectId).then(setData).finally(() => setLoading(false));
  }, [projectId]);

  if (loading) return <div className="mr-panel"><p className="mr-empty">Chargement…</p></div>;
  if (!data || (data.totals.length === 0 && (data.rapprochement ?? []).length === 0)) {
    return (
      <div className="mr-panel">
        <p className="mr-empty">Aucune réception enregistrée. Saisissez des matériaux dans le journal quotidien.</p>
      </div>
    );
  }

  const visibleEntries = showAll ? data.entries : data.entries.slice(0, 10);
  const rapprochement  = data.rapprochement ?? [];
  const anomalies      = rapprochement.filter(r => r.status !== 'ok');

  return (
    <div className="mr-panel">
      {/* Rapprochement journal ↔ stock central — « deux vérités du ciment » */}
      {rapprochement.length > 0 && (
        <div className="mr-recon">
          <p className="mr-entries__title" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            Rapprochement journal / magasin
            {anomalies.length > 0
              ? <span className="badge badge--warning">{anomalies.length} anomalie{anomalies.length > 1 ? 's' : ''}</span>
              : <span className="badge badge--success">OK</span>}
          </p>
          <table className="mr-table">
            <thead>
              <tr><th>Matériau</th><th>Journal (reçu)</th><th>Magasin (sorti)</th><th>Écart</th><th>Valeur sortie</th><th>Statut</th></tr>
            </thead>
            <tbody>
              {rapprochement.map(r => {
                const cfg = RECON_LABEL[r.status];
                return (
                  <tr key={r.name}>
                    <td>{r.name}</td>
                    <td className="mr-table__qty">{r.journal_qty.toLocaleString('fr-FR')} <span className="mr-table__unit">{r.unit}</span></td>
                    <td className="mr-table__qty">{r.stock_qty.toLocaleString('fr-FR')} <span className="mr-table__unit">{r.unit}</span></td>
                    <td className="mr-table__qty" style={{ color: r.ecart_qty === 0 ? 'inherit' : r.ecart_qty > 0 ? '#f59e0b' : '#ef4444' }}>
                      {r.ecart_qty > 0 ? '+' : ''}{r.ecart_qty.toLocaleString('fr-FR')}
                    </td>
                    <td className="mr-table__qty">{r.stock_value > 0 ? `${Math.round(r.stock_value).toLocaleString('fr-FR')} FCFA` : '—'}</td>
                    <td><span className="badge" style={{ color: cfg.color, borderColor: `${cfg.color}55`, background: `${cfg.color}12` }} title={cfg.hint}>{cfg.label}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '6px 0 0' }}>
            Jointure par nom de matériau. « Valeur sortie » = quantité sortie × PU moyen pondéré du magasin — coût matériaux réellement consommé par ce chantier.
          </p>
        </div>
      )}

      {/* Grille des totaux */}
      <div className="mr-grid">
        {data.totals.map(t => {
          const icon = MATERIAL_ICONS[t.name] ?? '📦';
          const lastDate = new Date(t.last_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
          return (
            <div key={t.name} className="mr-card">
              <div className="mr-card__icon">{icon}</div>
              <div className="mr-card__body">
                <span className="mr-card__name">{t.name}</span>
                <span className="mr-card__qty">{t.total_qty.toLocaleString('fr-FR')} <em>{t.unit}</em></span>
                <span className="mr-card__meta">{t.delivery_count} livraison{t.delivery_count > 1 ? 's' : ''} · dernier {lastDate}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Entrées récentes */}
      <div className="mr-entries">
        <p className="mr-entries__title">Historique des livraisons</p>
        <table className="mr-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Matériau</th>
              <th>Quantité</th>
            </tr>
          </thead>
          <tbody>
            {visibleEntries.map((e, i) => {
              const d = new Date(e.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
              return (
                <tr key={i}>
                  <td className="mr-table__date">{d}</td>
                  <td>
                    <span className="mr-table__icon">{MATERIAL_ICONS[e.name] ?? '📦'}</span>
                    {e.name}
                  </td>
                  <td className="mr-table__qty">{e.quantity.toLocaleString('fr-FR')} <span className="mr-table__unit">{e.unit}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {data.entries.length > 10 && (
          <button className="mr-show-more" onClick={() => setShowAll(v => !v)}>
            {showAll ? 'Voir moins' : `Voir les ${data.entries.length - 10} autres entrées`}
          </button>
        )}
      </div>
    </div>
  );
}
