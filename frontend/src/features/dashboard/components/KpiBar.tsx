import type { DashboardStats } from '../api/get-dashboard';
import { fmtKpi } from '../../../lib/formatters';
import { type RoleGroup, KPI_HIDDEN_FOR } from '../../../lib/roles';

type KpiItem = {
  label: string;
  value: string;
  sub: string;
  valueColor?: string;
  valueNode?: React.ReactNode;
  trend?: { label: string; positive: boolean };
  icon: React.ReactNode;
};

type Props = { stats: DashboardStats; roleGroup: RoleGroup };

export default function KpiBar({ stats, roleGroup }: Props) {
  const tauxEngagement = stats.budget_total > 0
    ? Math.round((stats.budget_active / stats.budget_total) * 100)
    : 0;

  const engagementGap = tauxEngagement - stats.avg_progress;
  const engagementSub = stats.avg_progress === 0
    ? tauxEngagement >= 80 ? 'À surveiller' : tauxEngagement >= 60 ? 'Vigilance' : 'Sous contrôle'
    : engagementGap > 15
      ? `⚠️ Sur-engagement vs ${stats.avg_progress}% avancé`
      : engagementGap < -15
        ? stats.avg_progress < 20
          ? `Normal — phase démarrage (${stats.avg_progress}% avancé)`
          : `Sous-consommation vs ${stats.avg_progress}% avancé`
        : `Cohérent avec ${stats.avg_progress}% d'avancement`;

  // Health-first order: signal d'abord, contexte en dernier
  const items: KpiItem[] = [
    {
      label: 'Santé portefeuille',
      value: `${stats.health_avg}/100`,
      valueColor: stats.health_avg >= 75 ? '#059669' : stats.health_avg >= 50 ? '#ea580c' : '#dc2626',
      sub: stats.health_avg >= 75 ? 'Portefeuille sain' : stats.health_avg >= 50 ? 'Vigilance requise' : 'En alerte critique',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
        </svg>
      ),
    },
    {
      label: 'États chantiers',
      value: '',
      valueNode: (
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 14, lineHeight: 1 }}>
          <span>🟢 <strong style={{ fontSize: 16 }}>{stats.health_green}</strong></span>
          <span>🟠 <strong style={{ fontSize: 16 }}>{stats.health_orange}</strong></span>
          <span>🔴 <strong style={{ fontSize: 16 }}>{stats.health_red}</strong></span>
        </div>
      ),
      sub: 'Sain · Attention · Critique',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21.21 15.89A10 10 0 1 1 8 2.83"/>
          <path d="M22 12A10 10 0 0 0 12 2v10z"/>
        </svg>
      ),
    },
    {
      label: 'Budget engagé',
      value: fmtKpi(stats.budget_active),
      sub: `sur ${fmtKpi(stats.budget_total)} FCFA prévu`,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/>
          <path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/>
          <circle cx="18" cy="14" r="1" fill="currentColor"/>
        </svg>
      ),
    },
    {
      label: "Taux d'engagement",
      value: `${tauxEngagement}%`,
      sub: engagementSub,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="20" x2="12" y2="10"/>
          <line x1="18" y1="20" x2="18" y2="4"/>
          <line x1="6" y1="20" x2="6" y2="16"/>
        </svg>
      ),
    },
    {
      label: 'Chantiers actifs',
      value: String(stats.active_count),
      sub: `sur ${stats.active_count + stats.completed_count + stats.draft_count} au portefeuille`,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
      ),
    },
    {
      label: 'Budget prévisionnel',
      value: fmtKpi(stats.budget_total),
      sub: 'Enveloppe totale (FCFA HT)',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="7" width="20" height="14" rx="2"/>
          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
        </svg>
      ),
    },
  ];

  const visible = items.filter(item => !KPI_HIDDEN_FOR[item.label]?.includes(roleGroup));

  return (
    <div className="kpi-bar">
      {visible.map((item) => (
        <div key={item.label} className="kpi-bar__item">
          <div className="kpi-bar__top">
            <div className="kpi-bar__icon-sm">{item.icon}</div>
            {item.trend && (
              <span className={`kpi-trend ${item.trend.positive ? 'kpi-trend--up' : 'kpi-trend--down'}`}>
                {item.trend.positive ? '↑' : '↓'} {item.trend.label}
              </span>
            )}
          </div>
          <div className="kpi-bar__value" style={item.valueColor ? { color: item.valueColor } : undefined}>
            {item.valueNode ?? item.value}
          </div>
          <div className="kpi-bar__label">{item.label}</div>
          <div className="kpi-bar__sub">{item.sub}</div>
        </div>
      ))}
    </div>
  );
}
