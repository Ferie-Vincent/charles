import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import type { DashboardStats } from '../api/get-dashboard';
import type { Project } from '../../projects/types';

const COLORS = {
  active:    '#1abc9c',
  completed: '#3b7ddd',
  draft:     '#8391a2',
};

function shortName(name: string, max = 28): string {
  return name.length > max ? name.slice(0, max) + '…' : name;
}

function formatM(value: number): string {
  if (value >= 1_000_000_000) return (value / 1_000_000_000).toFixed(2) + ' Mds';
  return (value / 1_000_000).toFixed(0) + ' M';
}

type Props = {
  stats: DashboardStats;
  activeProjects: Project[];
};

export default function DashboardCharts({ stats, activeProjects }: Props) {
  const pieData = [
    { name: 'Actifs',     value: stats.active_count,    color: COLORS.active    },
    { name: 'Terminés',   value: stats.completed_count,  color: COLORS.completed },
    { name: 'Brouillons', value: stats.draft_count,      color: COLORS.draft     },
  ].filter(d => d.value > 0);

  const barData = [...activeProjects]
    .sort((a, b) => Number(b.budget_amount) - Number(a.budget_amount))
    .slice(0, 8)
    .map(p => ({
      name:   shortName(p.name),
      budget: Number(p.budget_amount),
    }));

  return (
    <div className="detail-grid" style={{ marginBottom: 16 }}>

      {/* ── Donut répartition statuts ── */}
      <div className="card card--half">
        <h3 className="card-title">Répartition par statut</h3>
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={pieData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={3}
              label={({ name, value }) => `${name} (${value})`}
              labelLine={false}
            >
              {pieData.map(entry => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip formatter={(value: number) => [`${value} chantier(s)`, '']} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* ── Bar top budgets actifs ── */}
      <div className="card card--half">
        <h3 className="card-title">Top 8 budgets — chantiers actifs</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart
            data={barData}
            layout="vertical"
            margin={{ top: 0, right: 40, left: 8, bottom: 0 }}
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
              width={160}
              tick={{ fontSize: 11, fill: '#2f3944' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              formatter={(value: number) => [formatM(value) + ' FCFA', 'Budget']}
              cursor={{ fill: 'rgba(59,125,221,0.06)' }}
            />
            <Bar dataKey="budget" fill="#3b7ddd" radius={[0, 4, 4, 0]} barSize={14} />
          </BarChart>
        </ResponsiveContainer>
      </div>

    </div>
  );
}
