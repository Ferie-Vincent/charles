import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ReferenceLine, ResponsiveContainer,
} from 'recharts';
import type { DailyLog } from '../../daily-logs/types';

type Props = {
  logs: DailyLog[];
  startDate: string;
  endDate: string;
  targetProgress: number;
};

type DataPoint = {
  date: string;       // AAAA-MM-JJ
  label: string;      // libellé d'affichage court
  theorique: number;  // % théorique linéaire
  reel: number | null;// avancement réel (report cumulé depuis les journaux)
};

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function toISO(d: Date): string {
  return d.toISOString().split('T')[0];
}

function fmtLabel(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function buildSeries(logs: DailyLog[], startDate: string, endDate: string, target: number): DataPoint[] {
  const start = new Date(startDate);
  const end   = new Date(endDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const totalMs   = end.getTime() - start.getTime();
  const seriesEnd = today < end ? today : end;

  // Correspondance date → avancement le plus récent depuis les journaux
  const logMap = new Map<string, number>();
  for (const log of logs) {
    const existing = logMap.get(log.log_date);
    if (existing === undefined || log.progress_percent > existing) {
      logMap.set(log.log_date, log.progress_percent);
    }
  }

  const points: DataPoint[] = [];
  let lastReal: number | null = null;
  let cursor = new Date(start);

  // N'émettre qu'un point tous les N jours pour garder le graphique lisible
  const totalDays = Math.ceil((seriesEnd.getTime() - start.getTime()) / 86_400_000);
  const step = totalDays > 180 ? 14 : totalDays > 90 ? 7 : totalDays > 30 ? 3 : 1;

  let dayIndex = 0;
  while (cursor <= seriesEnd) {
    const iso = toISO(cursor);
    const elapsedMs = cursor.getTime() - start.getTime();
    const theorique = totalMs > 0 ? Math.round((elapsedMs / totalMs) * target * 10) / 10 : 0;

    if (logMap.has(iso)) lastReal = logMap.get(iso)!;

    if (dayIndex % step === 0 || toISO(cursor) === toISO(seriesEnd)) {
      points.push({
        date: iso,
        label: fmtLabel(iso),
        theorique: Math.min(theorique, target),
        reel: lastReal,
      });
    }

    cursor = addDays(cursor, 1);
    dayIndex++;
  }

  // Toujours inclure le point de départ
  if (points.length === 0 || points[0].date !== startDate) {
    points.unshift({ date: startDate, label: fmtLabel(startDate), theorique: 0, reel: null });
  }

  return points;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="scurve-tooltip">
      <div className="scurve-tooltip__date">{label}</div>
      {payload.map((p: any) => (
        <div key={p.name} className="scurve-tooltip__row" style={{ color: p.color }}>
          <span>{p.name === 'theorique' ? 'Théorique' : 'Réel'}</span>
          <span>{p.value !== null ? `${p.value} %` : '—'}</span>
        </div>
      ))}
    </div>
  );
};

export default function SCurveChart({ logs, startDate, endDate, targetProgress }: Props) {
  const data = buildSeries(logs, startDate, endDate, targetProgress);

  if (data.length < 2) {
    return <p className="scurve-empty">Pas encore assez de données pour la courbe S.</p>;
  }

  const todayISO = toISO(new Date());
  const todayPoint = data.find(d => d.date === todayISO);

  return (
    <div className="scurve-wrap">
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={v => `${v}%`}
            width={40}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            formatter={v => v === 'theorique' ? 'Théorique' : 'Réel'}
            wrapperStyle={{ fontSize: 12 }}
          />

          {/* Ligne de référence aujourd'hui */}
          {todayPoint && (
            <ReferenceLine
              x={todayPoint.label}
              stroke="#ef4444"
              strokeDasharray="4 2"
              label={{ value: "Auj.", position: 'insideTopRight', fontSize: 10, fill: '#ef4444' }}
            />
          )}

          <Line
            type="monotone"
            dataKey="theorique"
            stroke="#94a3b8"
            strokeWidth={1.5}
            strokeDasharray="6 3"
            dot={false}
            activeDot={{ r: 4 }}
          />
          <Line
            type="monotone"
            dataKey="reel"
            stroke="#3b7ddd"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 5 }}
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>

      <div className="scurve-legend-note">
        Objectif contractuel : <strong>{targetProgress} %</strong> au {fmtLabel(endDate)}
      </div>
    </div>
  );
}
