import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getProject } from '../api/get-project';
import type { Project } from '../types';
import ActivityTimeline from '../components/ActivityTimeline';
import LogExplorer from '../../daily-logs/components/LogExplorer';
import { getDailyLogs, type DailyLogMeta } from '../../daily-logs/api/get-daily-logs';
import type { DailyLog } from '../../daily-logs/types';
import HealthScoreBadge from '../components/HealthScoreBadge';
import SCurveChart from '../components/SCurveChart';
import PhotoGallery from '../components/PhotoGallery';
import IncidentPanel from '../components/IncidentPanel';
import BudgetPanel from '../components/BudgetPanel';
import ReportsWidget from '../components/ReportsWidget';
import SafetyScoreWidget from '../components/SafetyScoreWidget';
import MaterialReceiptsPanel from '../components/MaterialReceiptsPanel';
import PhaseGanttWidget from '../components/PhaseGanttWidget';
import MeetingReportModal from '../components/MeetingReportModal';
import WhatsAppTestButton from '../components/WhatsAppTestButton';

const STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon', active: 'Actif', completed: 'Terminé', archived: 'Archivé',
};

const STATUS_COLOR: Record<string, string> = {
  draft: '#8391a2', active: '#10b981', completed: '#3b7ddd', archived: '#94a3b8',
};

const ROLE_LABELS: Record<string, string> = {
  'direction': 'Direction',
  'directeur-technique': 'Directeur Technique',
  'conducteur-travaux': 'Conducteur de Travaux',
  'chef-chantier': 'Chef de Chantier',
  'metreur-economiste': 'Métreur Économiste',
  'comptable': 'Comptable',
  'lecture-seule': 'Lecture seule',
};

function formatDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatBudget(amount: string) {
  const n = Number(amount);
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toLocaleString('fr-FR', { maximumFractionDigits: 2 }) + ' Mds FCFA';
  if (n >= 1_000_000) return (n / 1_000_000).toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' M FCFA';
  return n.toLocaleString('fr-FR') + ' FCFA';
}

function getDaysRemaining(endDate: string | null): number | null {
  if (!endDate) return null;
  return Math.ceil((new Date(endDate).getTime() - Date.now()) / 86_400_000);
}

function splitHeroName(name: string): { title: string; sub: string } {
  const idx = name.indexOf(' – ');
  if (idx > -1) return { title: name.slice(0, idx), sub: name.slice(idx + 3) };
  return { title: name, sub: '' };
}

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [logMeta, setLogMeta] = useState<DailyLogMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showMeetingModal, setShowMeetingModal] = useState(false);

  useEffect(() => {
    if (!id) return;
    const numId = Number(id);
    Promise.all([getProject(numId), getDailyLogs(numId)])
      .then(([proj, logsRes]) => {
        setProject(proj);
        setLogs(logsRes.data);
        setLogMeta(logsRes.meta);
      })
      .catch(() => setError('Chantier introuvable.'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="page-content"><p>Chargement…</p></div>;
  if (error || !project) return <div className="page-content"><p className="form-error">{error ?? 'Erreur.'}</p></div>;

  const avancement   = logMeta?.latest_progress ?? null;
  const incidents    = logMeta?.incident_count ?? 0;
  const jourssuivis  = logMeta?.total_logs ?? 0;
  const daysLeft     = getDaysRemaining(project.end_date);
  const { title, sub } = splitHeroName(project.name);

  const delayLabel = daysLeft === null ? null
    : daysLeft < 0  ? `${Math.abs(daysLeft)} j de retard`
    : daysLeft === 0 ? "Aujourd'hui"
    : `${daysLeft} j restants`;

  const delayColor = daysLeft === null ? 'rgba(255,255,255,0.5)'
    : daysLeft < 0  ? '#f87171'
    : daysLeft <= 30 ? '#fbbf24'
    : '#34d399';

  return (
    <div className="project-detail">

      {/* ── Hero ── */}
      <div className="proj-hero">
        <Link to="/projects" className="proj-hero__back">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><path d="M19 12H5"/><polyline points="12 19 5 12 12 5"/></svg>
          Retour aux chantiers
        </Link>

        <div className="proj-hero__body">
          <div className="proj-hero__left">
            <div className="proj-hero__badges">
              <span className="proj-hero__code">{project.code}</span>
              <span
                className="proj-hero__status"
                style={{ background: `${STATUS_COLOR[project.status]}22`, color: STATUS_COLOR[project.status], borderColor: `${STATUS_COLOR[project.status]}44` }}
              >
                {STATUS_LABELS[project.status] ?? project.status}
              </span>
            </div>
            <h1 className="proj-hero__title">{title}</h1>
            {sub && <p className="proj-hero__sub">{sub}</p>}
            <div className="proj-hero__chips">
              {project.location && (
                <span className="proj-hero__chip">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="12" height="12"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                  {project.location}
                </span>
              )}
              {project.start_date && (
                <span className="proj-hero__chip">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="12" height="12"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                  Début {formatDate(project.start_date)}
                </span>
              )}
              {project.end_date && (
                <span className="proj-hero__chip">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="12" height="12"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  Fin prévue {formatDate(project.end_date)}
                </span>
              )}
            </div>
          </div>

          <div className="proj-hero__right">
            <div className="proj-hero__budget-block">
              <span className="proj-hero__budget-label">Budget prévisionnel</span>
              <span className="proj-hero__budget-value">{formatBudget(project.budget_amount)}</span>
            </div>
            <div className="proj-hero__right-bottom">
              {delayLabel && (
                <div className="proj-hero__delay" style={{ color: delayColor, borderColor: `${delayColor}44` }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  {delayLabel}
                </div>
              )}
              <HealthScoreBadge projectId={project.id} />
              <a
                href={`http://localhost:8000/api/projects/${project.id}/report/pdf`}
                target="_blank"
                rel="noreferrer"
                className="proj-hero__report-btn"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="13" height="13">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
                </svg>
                Exporter rapport
              </a>
              <button
                className="proj-hero__report-btn"
                onClick={() => setShowMeetingModal(true)}
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff' }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="13" height="13">
                  <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                </svg>
                CR Réunion IA
              </button>
            </div>
          </div>
        </div>
      </div>

      {showMeetingModal && (
        <MeetingReportModal projectId={project.id} onClose={() => setShowMeetingModal(false)} />
      )}

      {/* ── KPI strip ── */}
      <div className="proj-kpi-row">
        <div className="proj-kpi">
          <div className="proj-kpi__icon proj-kpi__icon--blue">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
          </div>
          <div className="proj-kpi__body">
            <span className="proj-kpi__value" style={{ color: avancement !== null ? '#3b7ddd' : 'var(--text-muted)' }}>
              {avancement !== null ? `${avancement} %` : '—'}
            </span>
            <span className="proj-kpi__label">Avancement réel</span>
            {avancement !== null && (
              <div className="proj-kpi__bar">
                <div className="proj-kpi__bar-fill" style={{ width: `${avancement}%`, background: '#3b7ddd' }} />
              </div>
            )}
          </div>
        </div>

        <div className="proj-kpi">
          <div className="proj-kpi__icon proj-kpi__icon--orange">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          </div>
          <div className="proj-kpi__body">
            <span className="proj-kpi__value" style={{ color: delayColor }}>
              {delayLabel ?? '—'}
            </span>
            <span className="proj-kpi__label">Délai contractuel</span>
          </div>
        </div>

        <div className="proj-kpi">
          <div className="proj-kpi__icon proj-kpi__icon--teal">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
          </div>
          <div className="proj-kpi__body">
            <span className="proj-kpi__value" style={{ color: '#1abc9c' }}>{jourssuivis}</span>
            <span className="proj-kpi__label">Journaux saisis</span>
          </div>
        </div>

        <div className="proj-kpi">
          <div className={`proj-kpi__icon ${incidents > 0 ? 'proj-kpi__icon--red' : 'proj-kpi__icon--green'}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          </div>
          <div className="proj-kpi__body">
            <span className="proj-kpi__value" style={{ color: incidents > 0 ? '#ef4444' : '#10b981' }}>{incidents}</span>
            <span className="proj-kpi__label">Incidents signalés</span>
          </div>
        </div>
      </div>

      {/* ── Courbe S ── */}
      {project.start_date && project.end_date && (
        <div className="card card--full" style={{ marginBottom: 16 }}>
          <div className="card-head">
            <div className="card-icon card-icon--blue">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
              </svg>
            </div>
            <div>
              <h3 className="card-title" style={{ margin: 0 }}>Courbe S — Avancement réel vs théorique</h3>
              <p className="card-subtitle" style={{ margin: 0 }}>Progression cumulée depuis le début du chantier</p>
            </div>
          </div>
          <SCurveChart
            logs={logs}
            startDate={project.start_date}
            endDate={project.end_date}
            targetProgress={project.target_progress ?? 100}
          />
        </div>
      )}

      {/* ── Gantt BTP (#24) ── */}
      <div className="card card--full" style={{ marginBottom: 16 }}>
        <div className="card-head">
          <div className="card-icon" style={{ background: '#ede9fe' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
              <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
              <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
            </svg>
          </div>
          <div>
            <h3 className="card-title" style={{ margin: 0 }}>Planning phases BTP</h3>
            <p className="card-subtitle" style={{ margin: 0 }}>Distribution estimée selon la répartition standard BTP</p>
          </div>
        </div>
        <PhaseGanttWidget project={project} progressPercent={avancement} />
      </div>

      {/* ── Journal exploration ── */}
      <div className="card card--full" style={{ marginBottom: 16 }}>
        <div className="card-head">
          <div className="card-icon card-icon--orange">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
          </div>
          <div>
            <h3 className="card-title" style={{ margin: 0 }}>Rapports journaliers</h3>
            <p className="card-subtitle" style={{ margin: 0 }}>Historique des rapports terrain saisis par l'équipe</p>
          </div>
        </div>
        <LogExplorer logs={logs} meta={logMeta} projectId={project.id} />
      </div>

      {/* ── Galerie Photos ── */}
      <div className="card card--full" style={{ marginBottom: 16 }}>
        <div className="card-head">
          <div className="card-icon card-icon--purple">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
              <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
            </svg>
          </div>
          <div>
            <h3 className="card-title" style={{ margin: 0 }}>Galerie photos terrain</h3>
            <p className="card-subtitle" style={{ margin: 0 }}>Photos taguées par phase — glisser-déposer pour ajouter</p>
          </div>
        </div>
        <PhotoGallery projectId={project.id} />
      </div>

      {/* ── Réception Matériaux (#15) ── */}
      <div className="card card--full" style={{ marginBottom: 16 }}>
        <div className="card-head">
          <div className="card-icon" style={{ background: '#fef9c3' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#ca8a04" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
              <line x1="12" y1="22.08" x2="12" y2="12"/>
            </svg>
          </div>
          <div>
            <h3 className="card-title" style={{ margin: 0 }}>Réceptions matériaux</h3>
            <p className="card-subtitle" style={{ margin: 0 }}>Totaux et historique des livraisons enregistrées dans le journal</p>
          </div>
        </div>
        <MaterialReceiptsPanel projectId={project.id} />
      </div>

      {/* ── Trésorerie ── */}
      <div className="card card--full" style={{ marginBottom: 16 }}>
        <div className="card-head">
          <div className="card-icon card-icon--green">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
              <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
            </svg>
          </div>
          <div>
            <h3 className="card-title" style={{ margin: 0 }}>Trésorerie prévisionnelle — 90 jours</h3>
            <p className="card-subtitle" style={{ margin: 0 }}>Suivi budget prévisionnel, engagements et décaissements</p>
          </div>
        </div>
        <BudgetPanel projectId={project.id} />
      </div>

      {/* ── Incidents ── */}
      <div style={{ marginBottom: 16 }}>
        <IncidentPanel projectId={project.id} />
      </div>

      {/* ── Score Sécurité Mensuel (#23) ── */}
      <div className="card card--full" style={{ marginBottom: 16 }}>
        <div className="card-head">
          <div className="card-icon" style={{ background: '#fef2f2' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>
          <div>
            <h3 className="card-title" style={{ margin: 0 }}>Score Sécurité Mensuel</h3>
            <p className="card-subtitle" style={{ margin: 0 }}>Basé sur les incidents déclarés ce mois — pondérés par gravité</p>
          </div>
        </div>
        <SafetyScoreWidget projectId={project.id} />
      </div>

      {/* ── Rapports archivés ── */}
      <div className="card card--full" style={{ marginBottom: 16 }}>
        <div className="card-head">
          <div className="card-icon card-icon--orange">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <h3 className="card-title" style={{ margin: 0 }}>Rapports hebdomadaires</h3>
            <p className="card-subtitle" style={{ margin: 0 }}>Archives générées automatiquement — téléchargeables à tout moment</p>
          </div>
          <WhatsAppTestButton projectId={project.id} />
        </div>
        <ReportsWidget projectId={project.id} />
      </div>

      {/* ── Équipe + Activité ── */}
      <div className="detail-grid">
        <div className="card card--half">
          <div className="card-head">
            <div className="card-icon card-icon--teal">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            </div>
            <h3 className="card-title" style={{ margin: 0 }}>Équipe du chantier</h3>
          </div>
          {!project.members || project.members.length === 0 ? (
            <p className="empty-state">Aucun membre assigné.</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Rôle chantier</th>
                  <th>Email</th>
                </tr>
              </thead>
              <tbody>
                {project.members.map(m => (
                  <tr key={m.id}>
                    <td style={{ fontWeight: 600 }}>{m.user.name}</td>
                    <td>
                      <span className="badge badge-type-team">
                        {ROLE_LABELS[m.assignment_role] ?? m.assignment_role}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{m.user.email}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="card card--half card--activity">
          <div className="card-head">
            <div className="card-icon card-icon--gray">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            </div>
            <h3 className="card-title" style={{ margin: 0 }}>Historique des actions</h3>
          </div>
          <ActivityTimeline activities={project.activities ?? []} />
        </div>
      </div>

    </div>
  );
}
