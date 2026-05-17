import { useState, useEffect } from 'react';
import { getMaterialReceipts, type MaterialReceiptsData } from '../api/get-material-receipts';

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
  if (!data || data.totals.length === 0) {
    return (
      <div className="mr-panel">
        <p className="mr-empty">Aucune réception enregistrée. Saisissez des matériaux dans le journal quotidien.</p>
      </div>
    );
  }

  const visibleEntries = showAll ? data.entries : data.entries.slice(0, 10);

  return (
    <div className="mr-panel">
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
