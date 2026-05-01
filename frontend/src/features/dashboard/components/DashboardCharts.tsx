import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import type { DashboardStats } from '../api/get-dashboard';
import type { Project } from '../../projects/types';

const COLORS = {
  active:    '#1abc9c',
  completed: '#3b7ddd',
  draft:     '#8391a2',
};

function smartName(name: string): string {
  const base = name.includes(' – ') ? name.split(' – ')[0].trim() : name;
  return base.length > 24 ? base.slice(0, 24) + '…' : base;
}

function formatM(value: number): string {
  if (value >= 1_000_000_000) return (value / 1_000_000_000).toFixed(1) + ' Mds';
  return (value / 1_000_000).toFixed(0) + ' M';
}

type Props = {
  stats: DashboardStats;
  activeProjects: Project[];
};

export default function DashboardCharts({ stats, activeProjects }: Props) {
  const pieData = [
    { name: 'Actifs',     value: stats.active_count,    color: COLORS.active    },
    { name: 'Terminés',   value: stats.completed_count, color: COLORS.completed },
    { name: 'Brouillons', value: stats.draft_count,     color: COLORS.draft     },
  ].filter(d => d.value > 0);

  const total = pieData.reduce((s, d) => s + d.value, 0);

  const barData = [...activeProjects]
    .sort((a, b) => Number(b.budget_amount) - Number(a.budget_amount))
    .slice(0, 8)
    .map(p => ({
      name:   smartName(p.name),
      budget: Number(p.budget_amount),
    }));

  return (
    <div className="detail-grid" style={{ marginBottom: 16 }}>

      {/* ── Donut répartition statuts ── */}
      <div className="card card--half">
        <div className="card-head">
          <div className="card-icon card-icon--teal">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
              <path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/>
            </svg>
          </div>
          <div>
            <h3 className="card-title" style={{ margin: 0 }}>Répartition par statut</h3>
            <p className="card-subtitle" style={{ margin: 0 }}>{total} chantiers au portefeuille</p>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={195}>
          <PieChart>
            <Pie
              data={pieData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={58}
              outerRadius={88}
              paddingAngle={3}
              labelLine={false}
            >
              {pieData.map(entry => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => [`${value} chantier(s)`, '']}
              contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e3eaef' }}
            />
          </PieChart>
        </ResponsiveContainer>

        <div className="chart-legend">
          {pieData.map(d => (
            <div key={d.name} className="chart-legend__item">
              <span className="chart-legend__dot" style={{ background: d.color }} />
              <span className="chart-legend__label">{d.name}</span>
              <span className="chart-legend__count">{d.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Bar top budgets actifs ── */}
      <div className="card card--half">
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

        <ResponsiveContainer width="100%" height={260}>
          <BarChart
            data={barData}
            layout="vertical"
            margin={{ top: 4, right: 48, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e3eaef" />
            <XAxis
              type="number"
              tickFormatter={formatM}
              tick={{ fontSize: 11, fill: '#8391a2' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={152}
              tick={{ fontSize: 11, fill: '#2f3944' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              formatter={(value) => [formatM(Number(value)) + ' FCFA', 'Budget']}
              cursor={{ fill: 'rgba(59,125,221,0.06)' }}
              contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e3eaef' }}
            />
            <Bar dataKey="budget" fill="#3b7ddd" radius={[0, 4, 4, 0]} barSize={16} />
          </BarChart>
        </ResponsiveContainer>
      </div>

    </div>
  );
}
