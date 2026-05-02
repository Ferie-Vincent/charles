import { useState } from 'react';
import { api } from '../../../lib/api';
import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { getProject } from '../api/get-project';
import ActivityTimeline from '../components/ActivityTimeline';
import LogCalendar from '../../daily-logs/components/LogCalendar';
import { getDailyLogs } from '../../daily-logs/api/get-daily-logs';
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
import SituationTravauxModal from '../components/SituationTravauxModal';
import WhatsAppTestButton from '../components/WhatsAppTestButton';
import DqePanel from '../../dqe/components/DqePanel';
import ProjectDocumentsPanel from '../../ged/components/ProjectDocumentsPanel';
import { useAuth } from '../../auth/stores/auth-store';
import { getRoleGroup } from '../../../lib/roles';
import CollapsibleSection from '../../../components/ui/CollapsibleSection';
import TerrainFAB from '../../../components/ui/TerrainFAB';

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
  const numId = Number(id);
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [showSituationModal, setShowSituationModal] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  async function handleExportPdf() {
    if (exportingPdf) return;
    setExportingPdf(true);
    try {
      const res = await api.get(`/projects/${numId}/report/pdf`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rapport-${numId}-${new Date().toISOString().slice(0, 10)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExportingPdf(false);
    }
  }
  const { user } = useAuth();
  const group = getRoleGroup(user?.role?.name ?? '');
  const isDTDG = group !== 'terrain';

  const { data: project, isLoading, isError } = useQuery({
    queryKey: ['project', numId],
    queryFn: () => getProject(numId),
    enabled: !!id,
    staleTime: 60_000,
  });
  const { data: logsData } = useQuery({
    queryKey: ['daily-logs', numId],
    queryFn: () => getDailyLogs(numId),
    enabled: !!id,
    staleTime: 60_000,
  });
  const logs    = logsData?.data ?? [];
  const logMeta = logsData?.meta ?? null;

  if (isLoading) return (
    <div className="project-detail">
      <div className="skeleton skeleton-hero" />
      <div className="skeleton-kpi-row">
        <div className="skeleton skeleton-kpi" />
        <div className="skeleton skeleton-kpi" />
        <div className="skeleton skeleton-kpi" />
        <div className="skeleton skeleton-kpi" />
      </div>
      <div className="skeleton skeleton-card" />
      <div className="skeleton skeleton-card" />
      <div className="skeleton skeleton-card" />
    </div>
  );
  if (isError || !project) return <div className="page-content"><p className="form-error">Chantier introuvable.</p></div>;

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
              <button
                type="button"
                className="proj-hero__report-btn"
                onClick={handleExportPdf}
                disabled={exportingPdf}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="13" height="13">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
                </svg>
                {exportingPdf ? 'Génération…' : 'Exporter rapport'}
              </button>
              {isDTDG && (
                <>
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
                  <button
                    className="proj-hero__report-btn"
                    onClick={() => setShowSituationModal(true)}
                    style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff' }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="13" height="13">
                      <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                    </svg>
                    Situation Travaux IA
                  </button>
                  <Link
                    to={`/projects/${project.id}/accounting`}
                    className="proj-hero__report-btn"
                    style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff' }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="13" height="13">
                      <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
                    </svg>
                    Comptabilité
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {showMeetingModal && (
        <MeetingReportModal projectId={project.id} onClose={() => setShowMeetingModal(false)} />
      )}
      {showSituationModal && (
        <SituationTravauxModal projectId={project.id} onClose={() => setShowSituationModal(false)} />
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

      {/* ── Documents d'initialisation ── */}
      <CollapsibleSection
        title="Documents du chantier"
        subtitle="Appel d'offres, ordre de service, marché, contrats et plans"
        defaultOpen
        icon={<div className="card-icon" style={{ background: '#ede9fe' }}><svg viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg></div>}
      >
        <ProjectDocumentsPanel projectId={project.id} />
      </CollapsibleSection>

      {/* ── 1. Journal mensuel (calendrier) ── */}
      <CollapsibleSection
        id="journal-section"
        title="Rapports journaliers"
        subtitle="Calendrier mensuel — cliquer un jour pour voir le détail"
        defaultOpen
        icon={<div className="card-icon card-icon--orange"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></div>}
      >
        <LogCalendar logs={logs} meta={logMeta} projectId={project.id} />
      </CollapsibleSection>

      {/* ── 2. Incidents ── */}
      <div style={{ marginBottom: 16 }}>
        <IncidentPanel projectId={project.id} />
      </div>

      {/* ── 3. Score Sécurité ── */}
      <CollapsibleSection
        title="Score Sécurité Mensuel"
        subtitle="Basé sur les incidents déclarés ce mois — pondérés par gravité"
        icon={<div className="card-icon" style={{ background: '#fef2f2' }}><svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></div>}
      >
        <SafetyScoreWidget projectId={project.id} />
      </CollapsibleSection>

      {/* ── 4. Courbe S ── */}
      {project.start_date && project.end_date && (
        <CollapsibleSection
          title="Courbe S — Avancement réel vs théorique"
          subtitle="Progression cumulée depuis le début du chantier"
          icon={<div className="card-icon card-icon--blue"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg></div>}
        >
          <SCurveChart logs={logs} startDate={project.start_date} endDate={project.end_date} targetProgress={project.target_progress ?? 100} />
        </CollapsibleSection>
      )}

      {/* ── 5. Trésorerie ── */}
      <CollapsibleSection
        title="Trésorerie prévisionnelle — 90 jours"
        subtitle="Suivi budget prévisionnel, engagements et décaissements"
        icon={<div className="card-icon card-icon--green"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></div>}
      >
        <BudgetPanel projectId={project.id} />
      </CollapsibleSection>

      {/* ── 6. DQE ── */}
      <div style={{ marginBottom: 16 }}>
        <DqePanel projectId={project.id} />
      </div>

      {/* ── 7. Gantt BTP ── */}
      <CollapsibleSection
        title="Planning phases BTP"
        subtitle="Distribution estimée selon la répartition standard BTP"
        icon={<div className="card-icon" style={{ background: '#ede9fe' }}><svg viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg></div>}
      >
        <PhaseGanttWidget project={project} progressPercent={avancement} />
      </CollapsibleSection>

      {/* ── 8. Réceptions matériaux ── */}
      <CollapsibleSection
        title="Réceptions matériaux"
        subtitle="Totaux et historique des livraisons enregistrées dans le journal"
        icon={<div className="card-icon" style={{ background: '#fef9c3' }}><svg viewBox="0 0 24 24" fill="none" stroke="#ca8a04" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg></div>}
      >
        <MaterialReceiptsPanel projectId={project.id} />
      </CollapsibleSection>

      {/* ── 9. Galerie Photos ── */}
      <CollapsibleSection
        title="Galerie photos terrain"
        subtitle="Photos taguées par phase — glisser-déposer pour ajouter"
        icon={<div className="card-icon card-icon--purple"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></div>}
      >
        <PhotoGallery projectId={project.id} />
      </CollapsibleSection>

      {/* ── 10. Rapports archivés ── */}
      <CollapsibleSection
        title="Rapports hebdomadaires"
        subtitle="Archives générées automatiquement — téléchargeables à tout moment"
        icon={<div className="card-icon card-icon--orange"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg></div>}
        extra={<WhatsAppTestButton projectId={project.id} />}
      >
        <ReportsWidget projectId={project.id} />
      </CollapsibleSection>

      {/* ── 11. Équipe + Activité ── */}
      <div className="detail-grid">
        <CollapsibleSection
          className="col-half"
          title="Équipe du chantier"
          icon={<div className="card-icon card-icon--teal"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></div>}
        >
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
        </CollapsibleSection>

        <CollapsibleSection
          className="col-half card--activity"
          title="Historique des actions"
          icon={<div className="card-icon card-icon--gray"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div>}
        >
          <ActivityTimeline activities={project.activities ?? []} />
        </CollapsibleSection>
      </div>

      <TerrainFAB targetId="journal-section" />

    </div>
  );
}
