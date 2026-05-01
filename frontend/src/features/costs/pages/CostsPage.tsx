import { useQuery } from '@tanstack/react-query';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { getPortfolioCosts, type ProjectCost } from '../api/get-portfolio-costs';
import PageHeader from '../../../components/ui/PageHeader';

function fmtFCFA(n: number): string {
  if (n >= 1_000_000_000) {
    return (n / 1_000_000_000).toLocaleString('fr-FR', { maximumFractionDigits: 2 }) + ' Mds FCFA';
  }
  if (n >= 1_000_000) {
    return (n / 1_000_000).toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' M FCFA';
  }
  return n.toLocaleString('fr-FR') + ' FCFA';
}

function fmtFCFAFull(n: number): string {
  return Number(n).toLocaleString('fr-FR') + ' FCFA';
}

const BAR_COLORS = {
  previsionnel: '#6366f1',
  engagement:   '#f59e0b',
  paiement:     '#22c55e',
};

function SoldeCell({ value }: { value: number }) {
  const positive = value >= 0;
  return (
    <span style={{ color: positive ? 'var(--success, #10b981)' : 'var(--danger, #ef4444)', fontWeight: 600 }}>
      {positive ? '+' : ''}{fmtFCFA(value)}
    </span>
  );
}

function TauxBadge({ value }: { value: number }) {
  let color = 'var(--success, #10b981)';
  if (value < 40) color = 'var(--danger, #ef4444)';
  else if (value < 70) color = 'var(--warning, #f59e0b)';
  return <span style={{ color, fontWeight: 600 }}>{value.toFixed(1)}%</span>;
}

export default function CostsPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['portfolio-costs'],
    queryFn: getPortfolioCosts,
  });

  if (isLoading) {
    return (
      <div className="pc-page">
        <PageHeader
          breadcrumb="PORTEFEUILLE · 2026"
          title="Trésorerie Portefeuille"
          subtitle="Synthèse des budgets, engagements et paiements par chantier."
        />
        <div className="pc-loading">Chargement des données…</div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="pc-page">
        <PageHeader
          breadcrumb="PORTEFEUILLE · 2026"
          title="Trésorerie Portefeuille"
          subtitle="Synthèse des budgets, engagements et paiements par chantier."
        />
        <div className="pc-error">Impossible de charger les données de trésorerie.</div>
      </div>
    );
  }

  const { totals, projects } = data;

  const chartData = projects.map((p: ProjectCost) => ({
    name:         p.code,
    previsionnel: p.previsionnel,
    engagement:   p.engagement,
    paiement:     p.paiement,
  }));

  const hasProjects = projects.length > 0;

  return (
    <div className="pc-page">
      <PageHeader
        breadcrumb="PORTEFEUILLE · 2026"
        title="Trésorerie Portefeuille"
        subtitle="Synthèse des budgets, engagements et paiements par chantier."
      />

      {/* KPI Bar */}
      <div className="pc-kpi-bar">
        <div className="pc-kpi-card">
          <div className="pc-kpi-card__label">Total prévisionnel</div>
          <div className="pc-kpi-card__value">{fmtFCFA(totals.previsionnel)}</div>
        </div>
        <div className="pc-kpi-card">
          <div className="pc-kpi-card__label">Total engagé</div>
          <div className="pc-kpi-card__value pc-kpi-card__value--engagement">{fmtFCFA(totals.engagement)}</div>
          <div className="pc-kpi-card__sub">{totals.taux_engagement.toFixed(1)}% du prévisionnel</div>
        </div>
        <div className="pc-kpi-card">
          <div className="pc-kpi-card__label">Total payé</div>
          <div className="pc-kpi-card__value pc-kpi-card__value--paiement">{fmtFCFA(totals.paiement)}</div>
          <div className="pc-kpi-card__sub">{totals.taux_paiement.toFixed(1)}% du prévisionnel</div>
        </div>
        <div className="pc-kpi-card">
          <div className="pc-kpi-card__label">Solde global</div>
          <div className={`pc-kpi-card__value ${totals.solde >= 0 ? 'pc-kpi-card__value--positive' : 'pc-kpi-card__value--negative'}`}>
            {totals.solde >= 0 ? '+' : ''}{fmtFCFA(totals.solde)}
          </div>
          <div className="pc-kpi-card__sub">Prévisionnel − Payé</div>
        </div>
      </div>

      {!hasProjects ? (
        <div className="pc-empty">Aucun chantier avec données budgétaires.</div>
      ) : (
        <>
          {/* Grouped BarChart */}
          <div className="pc-section">
            <h2 className="pc-section__title">Répartition par chantier</h2>
            <div className="pc-chart-card">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartData} margin={{ top: 8, right: 16, bottom: 8, left: 16 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis tickFormatter={(v: number) => fmtFCFA(v)} tick={{ fontSize: 10, fill: '#64748b' }} width={90} />
                  <Tooltip
                    formatter={(value: number, name: string) => [fmtFCFAFull(value), name.charAt(0).toUpperCase() + name.slice(1)]}
                    contentStyle={{ fontSize: 12, borderRadius: 6, border: '1px solid #e2e8f0' }}
                  />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: 12 }}
                    formatter={(value: string) => value.charAt(0).toUpperCase() + value.slice(1)}
                  />
                  <Bar dataKey="previsionnel" fill={BAR_COLORS.previsionnel} radius={[3, 3, 0, 0]}>
                    {chartData.map((_: unknown, i: number) => (
                      <Cell key={i} fill={BAR_COLORS.previsionnel} />
                    ))}
                  </Bar>
                  <Bar dataKey="engagement" fill={BAR_COLORS.engagement} radius={[3, 3, 0, 0]}>
                    {chartData.map((_: unknown, i: number) => (
                      <Cell key={i} fill={BAR_COLORS.engagement} />
                    ))}
                  </Bar>
                  <Bar dataKey="paiement" fill={BAR_COLORS.paiement} radius={[3, 3, 0, 0]}>
                    {chartData.map((_: unknown, i: number) => (
                      <Cell key={i} fill={BAR_COLORS.paiement} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Detail Table */}
          <div className="pc-section">
            <h2 className="pc-section__title">Détail par chantier</h2>
            <div className="pc-table-wrap">
              <table className="pc-table">
                <thead>
                  <tr>
                    <th className="pc-table__th">Chantier</th>
                    <th className="pc-table__th pc-table__th--num">Prévisionnel</th>
                    <th className="pc-table__th pc-table__th--num">Engagé</th>
                    <th className="pc-table__th pc-table__th--num">Payé</th>
                    <th className="pc-table__th pc-table__th--num">Solde</th>
                    <th className="pc-table__th pc-table__th--num">Taux Engagement</th>
                    <th className="pc-table__th pc-table__th--num">Taux Paiement</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map((p: ProjectCost) => (
                    <tr key={p.id} className="pc-table__row">
                      <td className="pc-table__td">
                        <div className="pc-project-name">{p.name}</div>
                        <div className="pc-project-code">{p.code}</div>
                      </td>
                      <td className="pc-table__td pc-table__td--num">{fmtFCFA(p.previsionnel)}</td>
                      <td className="pc-table__td pc-table__td--num">{fmtFCFA(p.engagement)}</td>
                      <td className="pc-table__td pc-table__td--num">{fmtFCFA(p.paiement)}</td>
                      <td className="pc-table__td pc-table__td--num">
                        <SoldeCell value={p.solde} />
                      </td>
                      <td className="pc-table__td pc-table__td--num">
                        <TauxBadge value={p.taux_engagement} />
                      </td>
                      <td className="pc-table__td pc-table__td--num">
                        <TauxBadge value={p.taux_paiement} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
