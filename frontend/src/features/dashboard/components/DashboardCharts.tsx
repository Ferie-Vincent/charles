import { Link } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import type { ActiveProject } from '../api/get-dashboard';

const HEALTH_COLOR = { green: '#059669', orange: '#ea580c', red: '#dc2626' };
const HEALTH_LABEL = { green: 'Sain', orange: 'Attention', red: 'Critique' };

function smartName(name: string): string {
  const base = name.includes(' – ') ? name.split(' – ')[0].trim() : name;
  return base.length > 22 ? base.slice(0, 22) + '…' : base;
}

function formatM(value: number): string {
  if (value >= 1_000_000_000) return (value / 1_000_000_000).toFixed(1) + ' Mds';
  return (value / 1_000_000).toFixed(0) + ' M';
}

type Props = { activeProjects: ActiveProject[]; className?: string };

export function BudgetBarsCard({ activeProjects, className = '' }: Props) {
  const barData = [...activeProjects]
    .sort((a, b) => Number(b.budget_amount) - Number(a.budget_amount))
    .slice(0, 8)
    .map(p => ({ name: smartName(p.name), budget: Number(p.budget_amount) }));

  return (
    <div className={`card ${className}`}>
      <div className="card-head">
        <div className="card-icon card-icon--blue">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
            <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
            <line x1="6" y1="20" x2="6" y2="14"/>
          </svg>
        </div>
        <div>
          <h3 className="card-title" style={{ margin: 0 }}>Top 8 budgets — chantiers actifs</h3>
          <p className="card-subtitle" style={{ margin: 0 }}>Classés par budget engagé</p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={barData} layout="vertical" margin={{ top: 4, right: 56, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e3eaef" />
          <XAxis
            type="number" tickFormatter={formatM}
            tick={{ fontSize: 11, fill: '#8391a2' }} axisLine={false} tickLine={false}
          />
          <YAxis
            type="category" dataKey="name" width={200}
            tick={{ fontSize: 12, fill: '#2f3944' }} axisLine={false} tickLine={false}
          />
          <Tooltip
            formatter={(value) => [formatM(Number(value)) + ' FCFA', 'Budget']}
            cursor={{ fill: 'rgba(59,125,221,0.06)' }}
            contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e3eaef' }}
          />
          <Bar dataKey="budget" fill="#3b7ddd" radius={[0, 4, 4, 0]} barSize={18} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CriticitéCard({ activeProjects, className = '' }: Props) {
  const criticite = [...activeProjects]
    .sort((a, b) => a.health.score - b.health.score)
    .slice(0, 8);

  return (
    <div className={`card ${className}`}>
      <div className="card-head">
        <div className="card-icon card-icon--red">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        </div>
        <div>
          <h3 className="card-title" style={{ margin: 0 }}>Chantiers par criticité</h3>
          <p className="card-subtitle" style={{ margin: 0 }}>Du plus critique au plus sain</p>
        </div>
      </div>

      <div style={{ maxHeight: 260, overflowY: 'auto' }}>
      <table className="data-table">
        <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-card)', zIndex: 1 }}>
          <tr>
            <th>Chantier</th>
            <th>Santé</th>
            <th style={{ textAlign: 'right' }}>Budget</th>
          </tr>
        </thead>
        <tbody>
          {criticite.map(p => (
            <tr key={p.id}>
              <td>
                <Link
                  to={`/projects/${p.id}`}
                  style={{ fontWeight: 700, color: 'var(--accent)', textDecoration: 'none', fontSize: '0.82rem' }}
                >
                  {p.code}
                </Link>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 1 }}>
                  {smartName(p.name)}
                </div>
              </td>
              <td>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  fontSize: '0.78rem', fontWeight: 600,
                  color: HEALTH_COLOR[p.health.status],
                }}>
                  {p.health.score}/100
                  <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>
                    {HEALTH_LABEL[p.health.status]}
                  </span>
                </span>
              </td>
              <td style={{ textAlign: 'right', fontWeight: 600, fontSize: '0.82rem' }}>
                {formatM(Number(p.budget_amount))} FCFA
              </td>
            </tr>
          ))}
          {criticite.length === 0 && (
            <tr>
              <td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px 0' }}>
                Aucun chantier actif
              </td>
            </tr>
          )}
        </tbody>
      </table>
      </div>
    </div>
  );
}

/** @deprecated Use BudgetBarsCard + CriticitéCard directly */
export default function DashboardCharts({ activeProjects }: { activeProjects: ActiveProject[] }) {
  return (
    <div className="detail-grid" style={{ marginBottom: 16 }}>
      <CriticitéCard activeProjects={activeProjects} className="card--half" />
      <BudgetBarsCard activeProjects={activeProjects} className="card--half" />
    </div>
  );
}
