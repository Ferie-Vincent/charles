import type { DashboardStats } from '../api/get-dashboard';

function formatShort(amount: number): string {
  if (amount >= 1_000_000_000)
    return (amount / 1_000_000_000).toLocaleString('fr-FR', { maximumFractionDigits: 1 }) + ' Mds FCFA';
  if (amount >= 1_000_000)
    return (amount / 1_000_000).toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' M FCFA';
  return amount.toLocaleString('fr-FR') + ' FCFA';
}

type KpiItem = {
  label: string;
  value: string;
  sub: string;
  trend?: { label: string; positive: boolean };
  icon: React.ReactNode;
};

type Props = { stats: DashboardStats };

export default function KpiBar({ stats }: Props) {
  const items: KpiItem[] = [
    {
      label: 'Chantiers actifs',
      value: String(stats.active_count),
      sub: `vs ${stats.active_count + 4} au portefeuille`,
      trend: { label: '+2', positive: true },
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
      ),
    },
    {
      label: 'Budget engagé',
      value: formatShort(stats.budget_active),
      sub: `${stats.budget_total > 0 ? Math.round((stats.budget_active / stats.budget_total) * 100) : 0}% du portefeuille`,
      trend: { label: '+8.1 %', positive: true },
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/>
          <path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/>
          <circle cx="18" cy="14" r="1" fill="currentColor"/>
        </svg>
      ),
    },
    {
      label: 'Budget portefeuille',
      value: formatShort(stats.budget_total),
      sub: 'Année fiscale 2026',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="7" width="20" height="14" rx="2"/>
          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
        </svg>
      ),
    },
    {
      label: 'Chantiers livrés',
      value: String(stats.completed_count),
      sub: 'Ce trimestre',
      trend: { label: '+1', positive: true },
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
          <polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
      ),
    },
    {
      label: 'En retard',
      value: String(stats.draft_count),
      sub: 'Action requise',
      trend: { label: '+2', positive: false },
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
      ),
    },
  ];

  return (
    <div className="kpi-bar">
      {items.map((item) => (
        <div key={item.label} className="kpi-bar__item">
          <div className="kpi-bar__top">
            <div className="kpi-bar__icon-sm">{item.icon}</div>
            {item.trend && (
              <span className={`kpi-trend ${item.trend.positive ? 'kpi-trend--up' : 'kpi-trend--down'}`}>
                {item.trend.positive ? '↑' : '↑'} {item.trend.label}
              </span>
            )}
          </div>
          <div className="kpi-bar__value">{item.value}</div>
          <div className="kpi-bar__label">{item.label}</div>
          <div className="kpi-bar__sub">{item.sub}</div>
        </div>
      ))}
    </div>
  );
}
