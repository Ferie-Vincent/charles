import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getProject } from '../api/get-project';
import type { Project } from '../types';
import PageHeader from '../../../components/ui/PageHeader';
import DailyLogForm from '../../daily-logs/components/DailyLogForm';
import { getDailyLogs, type DailyLogMeta } from '../../daily-logs/api/get-daily-logs';

export default function JournalPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [meta, setMeta] = useState<DailyLogMeta | null>(null);

  useEffect(() => {
    if (id) {
      const numId = Number(id);
      getProject(numId).then(setProject);
      getDailyLogs(numId).then(r => setMeta(r.meta));
    }
  }, [id]);

  const today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  // Taux de régularité: logs / max(1, days since start)
  const regularityRate = (() => {
    if (!meta || !project?.start_date) return null;
    const start = new Date(project.start_date);
    const now = new Date();
    const daysSinceStart = Math.max(1, Math.floor((now.getTime() - start.getTime()) / 86_400_000));
    return Math.min(100, Math.round((meta.total_logs / daysSinceStart) * 100));
  })();

  // Health score formula from CLAUDE.md
  const healthScore = (() => {
    if (!meta || !project) return null;
    const real = meta.latest_progress ?? 0;
    const target = project.target_progress ?? 0;
    const planningScore = real >= target ? 25 : Math.max(0, 25 - (target - real) * 1.25);
    const regularity = regularityRate !== null ? regularityRate / 100 : 0;
    const regularityScore = regularity * 25;
    const budgetScore = 25;
    const safetyScore = Math.max(0, 25 - meta.incident_count * 5);
    return Math.round(planningScore + regularityScore + budgetScore + safetyScore);
  })();

  const healthColor = healthScore === null ? undefined
    : healthScore >= 75 ? '#10b981'
    : healthScore >= 50 ? '#f59e0b'
    : '#ef4444';

  return (
    <div>
      <PageHeader
        breadcrumb={project?.name ?? '…'}
        title="Journal du jour"
        subtitle={today}
        action={<Link to={`/projects/${id}`} className="btn-secondary">← Retour au chantier</Link>}
      />

      <div className="proj-kpi-row">
        <div className="proj-kpi">
          <div className="proj-kpi__icon proj-kpi__icon--blue">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
          </div>
          <div className="proj-kpi__body">
            <div className="proj-kpi__value">{meta?.total_logs ?? '—'}</div>
            <div className="proj-kpi__label">Journaux saisis</div>
          </div>
        </div>

        <div className="proj-kpi">
          <div className="proj-kpi__icon proj-kpi__icon--teal">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
            </svg>
          </div>
          <div className="proj-kpi__body">
            <div className="proj-kpi__value">
              {regularityRate !== null ? `${regularityRate} %` : '—'}
            </div>
            <div className="proj-kpi__label">Taux de régularité</div>
          </div>
        </div>

        <div className="proj-kpi">
          <div className="proj-kpi__icon proj-kpi__icon--red">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <div className="proj-kpi__body">
            <div
              className="proj-kpi__value"
              style={{ color: (meta?.incident_count ?? 0) > 0 ? '#ef4444' : undefined }}
            >
              {meta?.incident_count ?? '—'}
            </div>
            <div className="proj-kpi__label">Incidents signalés</div>
          </div>
        </div>

        <div className="proj-kpi">
          <div className="proj-kpi__icon proj-kpi__icon--green">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          </div>
          <div className="proj-kpi__body">
            <div className="proj-kpi__value" style={{ color: healthColor }}>
              {healthScore !== null ? healthScore : '—'}
            </div>
            <div className="proj-kpi__label">Score santé</div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 640 }}>
        <div className="card">
          {project ? (
            <DailyLogForm
              projectId={project.id}
              onSuccess={() => navigate(`/projects/${id}`)}
            />
          ) : (
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Chargement…</p>
          )}
        </div>
      </div>
    </div>
  );
}
