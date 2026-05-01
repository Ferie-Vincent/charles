import type { DashboardStats } from '../api/get-dashboard';

function fmt(amount: number): string {
  if (amount >= 1_000_000_000)
    return (amount / 1_000_000_000).toLocaleString('fr-FR', { maximumFractionDigits: 1 }) + ' Mds FCFA';
  if (amount >= 1_000_000)
    return (amount / 1_000_000).toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' M FCFA';
  return amount.toLocaleString('fr-FR') + ' FCFA';
}

type BudgetRow = {
  label: string;
  value: string;
  pct: number;
  color: string;
};

type Props = { stats: DashboardStats };

export default function SynthesePortefeuille({ stats }: Props) {
  const total    = stats.budget_total   || 1;
  const active   = stats.budget_active  || 0;
  const engagePct = total > 0 ? (active / total) * 100 : 0;

  const rows: BudgetRow[] = [
    { label: 'Budget total portefeuille', value: fmt(total),  pct: 100,        color: '#e3eaef' },
    { label: 'Budget actif engagé',       value: fmt(active), pct: engagePct,  color: '#3b7ddd' },
  ];

  return (
    <div className="synthese-card card">
      <div className="synthese-card__head">
        <div className="card-icon card-icon--blue">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
            <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
            <line x1="6" y1="20" x2="6" y2="14"/>
          </svg>
        </div>
        <h3 className="synthese-card__title">Synthèse Portefeuille BTP</h3>
      </div>

      <div className="synthese-card__rows">
        {rows.map(row => (
          <div key={row.label} className="synthese-row">
            <div className="synthese-row__head">
              <span className="synthese-row__label">{row.label}</span>
              <span className="synthese-row__value" style={{ color: row.color === '#e3eaef' ? 'var(--text-main)' : row.color }}>
                {row.value}
              </span>
            </div>
            <div className="synthese-row__track">
              <div
                className="synthese-row__fill"
                style={{ width: `${row.pct}%`, background: row.color }}
              />
            </div>
          </div>
        ))}

        <div className="synthese-rate">
          <span className="synthese-rate__label">Taux d'engagement</span>
          <span className="synthese-rate__value">{engagePct.toFixed(1)} %</span>
        </div>

        <div className="synthese-mini-stats">
          <div className="synthese-mini-stat">
            <span className="synthese-mini-stat__count" style={{ color: 'var(--info)' }}>
              {stats.active_count}
            </span>
            <span className="synthese-mini-stat__label">Actifs</span>
          </div>
          <div className="synthese-mini-stat">
            <span className="synthese-mini-stat__count" style={{ color: 'var(--success)' }}>
              {stats.completed_count}
            </span>
            <span className="synthese-mini-stat__label">Livrés</span>
          </div>
          <div className="synthese-mini-stat">
            <span className="synthese-mini-stat__count" style={{ color: 'var(--danger)' }}>
              {stats.draft_count}
            </span>
            <span className="synthese-mini-stat__label">En retard</span>
          </div>
        </div>
      </div>
    </div>
  );
}
