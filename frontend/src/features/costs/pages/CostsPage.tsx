import SkeletonPage from '../../../components/ui/SkeletonPage';
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

  if (isLoading) return <div className="page-content"><SkeletonPage rows={3} /></div>;

  if (isError || !data) {
    return (
      <div>
        <PageHeader
          breadcrumb="PORTEFEUILLE · 2026"
          title="Trésorerie Portefeuille"
          subtitle="Synthèse des budgets, engagements et paiements par chantier."
        />
        <p style={{ padding: 24, color: 'var(--danger, #ef4444)' }}>Impossible de charger les données de trésorerie.</p>
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
    <div>
      <PageHeader
        breadcrumb="PORTEFEUILLE · 2026"
        title="Trésorerie Portefeuille"
        subtitle="Synthèse des budgets, engagements et paiements par chantier."
      />

      {/* KPI strip */}
      <div className="proj-kpi-row">
        <div className="proj-kpi">
          <div className="proj-kpi__icon proj-kpi__icon--blue">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 3H8a2 2 0 0 0-2 2v2h12V5a2 2 0 0 0-2-2z"/>
            </svg>
          </div>
          <div className="proj-kpi__body">
            <div className="proj-kpi__value" style={{ fontSize: 15 }}>{fmtFCFA(totals.previsionnel)}</div>
            <div className="proj-kpi__label">Total prévisionnel</div>
          </div>
        </div>

        <div className="proj-kpi">
          <div className="proj-kpi__icon proj-kpi__icon--orange">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
            </svg>
          </div>
          <div className="proj-kpi__body">
            <div className="proj-kpi__value" style={{ fontSize: 15 }}>{fmtFCFA(totals.engagement)}</div>
            <div className="proj-kpi__label">Total engagé ({totals.taux_engagement.toFixed(1)}%)</div>
          </div>
        </div>

        <div className="proj-kpi">
          <div className="proj-kpi__icon proj-kpi__icon--green">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <div className="proj-kpi__body">
            <div className="proj-kpi__value" style={{ fontSize: 15 }}>{fmtFCFA(totals.paiement)}</div>
            <div className="proj-kpi__label">Total payé ({totals.taux_paiement.toFixed(1)}%)</div>
          </div>
        </div>

        <div className="proj-kpi">
          <div className={`proj-kpi__icon ${totals.solde >= 0 ? 'proj-kpi__icon--teal' : 'proj-kpi__icon--red'}`}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points={totals.solde >= 0 ? '23 6 13.5 15.5 8.5 10.5 1 18' : '23 18 13.5 8.5 8.5 13.5 1 6'}/>
              <polyline points={totals.solde >= 0 ? '17 6 23 6 23 12' : '17 18 23 18 23 12'}/>
            </svg>
          </div>
          <div className="proj-kpi__body">
            <div
              className="proj-kpi__value"
              style={{ fontSize: 15, color: totals.solde >= 0 ? 'var(--success, #10b981)' : 'var(--danger, #ef4444)' }}
            >
              {totals.solde >= 0 ? '+' : ''}{fmtFCFA(totals.solde)}
            </div>
            <div className="proj-kpi__label">Solde global (prév. − payé)</div>
          </div>
        </div>
      </div>

      {!hasProjects ? (
        <p style={{ padding: 24, color: 'var(--text-muted)' }}>Aucun chantier avec données budgétaires.</p>
      ) : (
        <>
          {/* Grouped BarChart */}
          <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', marginBottom: 16 }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-body)' }}>Répartition par chantier</span>
            </div>
            <div style={{ padding: '16px 18px' }}>
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
          <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-body)' }}>Détail par chantier</span>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Chantier</th>
                  <th style={{ textAlign: 'right' }}>Prévisionnel</th>
                  <th style={{ textAlign: 'right' }}>Engagé</th>
                  <th style={{ textAlign: 'right' }}>Payé</th>
                  <th style={{ textAlign: 'right' }}>Solde</th>
                  <th style={{ textAlign: 'right' }}>Taux Engagement</th>
                  <th style={{ textAlign: 'right' }}>Taux Paiement</th>
                </tr>
              </thead>
              <tbody>
                {projects.length === 0 && (
                  <tr><td colSpan={7} className="acct-empty">Aucun chantier trouvé</td></tr>
                )}
                {projects.map((p: ProjectCost) => (
                  <tr key={p.id}>
                    <td>
                      <span style={{ fontWeight: 600, color: 'var(--text-body)' }}>{p.name}</span>
                      <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>{p.code}</p>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>{fmtFCFA(p.previsionnel)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>{fmtFCFA(p.engagement)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>{fmtFCFA(p.paiement)}</td>
                    <td style={{ textAlign: 'right' }}><SoldeCell value={p.solde} /></td>
                    <td style={{ textAlign: 'right' }}><TauxBadge value={p.taux_engagement} /></td>
                    <td style={{ textAlign: 'right' }}><TauxBadge value={p.taux_paiement} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
