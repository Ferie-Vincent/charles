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
  en_preparation: 'En préparation', active: 'Actif', completed: 'Terminé', archived: 'Archivé',
};
const STATUS_COLOR: Record<string, string> = {
  en_preparation: '#8391a2', active: '#10b981', completed: '#3b7ddd', archived: '#94a3b8',
};
const TYPE_MARCHE_LABELS: Record<string, string> = {
  forfait:             'Forfait',
  bordereau_prix:      'Bordereau de prix',
  depenses_controlees: 'Dépenses contrôlées',
  cle_en_main:         'Clé en main',
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

// P0 fix: guard null/NaN — never renders "NaN FCFA"
function formatBudget(amount: string | number | null | undefined): string {
  if (amount === null || amount === undefined || amount === '') return '—';
  const n = typeof amount === 'string' ? Number(amount) : amount;
  if (!isFinite(n) || isNaN(n)) return '—';
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toLocaleString('fr-FR', { maximumFractionDigits: 2 }) + ' Mds FCFA';
  if (n >= 1_000_000) return (n / 1_000_000).toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' M FCFA';
  return n.toLocaleString('fr-FR') + ' FCFA';
}

// P1 fix: invalid date returns null, not NaN
function getDaysRemaining(endDate: string | null): number | null {
  if (!endDate) return null;
  const ms = new Date(endDate).getTime() - Date.now();
  return isNaN(ms) ? null : Math.ceil(ms / 86_400_000);
}

// splitHeroName already handles missing separator — returns { title: name, sub: '' }
function splitHeroName(name: string): { title: string; sub: string } {
  const idx = name.indexOf(' – ');
  if (idx > -1) return { title: name.slice(0, idx), sub: name.slice(idx + 3) };
  return { title: name, sub: '' };
}

// ── Icon helpers (avoid JSX repetition) ────────────────────────────────────
const IcoChart   = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>;
const IcoCal     = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
const IcoClock   = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
const IcoMoney   = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>;
const IcoAlert   = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
const IcoShield  = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
const IcoDoc     = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>;
const IcoCheck   = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>;
const IcoGantt   = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>;
const IcoBox     = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>;
const IcoPhoto   = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>;
const IcoTeam    = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const numId = Number(id);
  const [showMeetingModal, setShowMeetingModal]   = useState(false);
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
  // Direction + DT : vue pilotage complète (ordre réunion CT)
  const isDGDT      = group === 'direction' || group === 'dt';
  // Management élargi : accès trésorerie/DQE
  const isManagement = isDGDT || group === 'metreur' || group === 'comptable';

  const { data: project, isLoading, isError } = useQuery({
    queryKey: ['project', numId],
    queryFn: () => getProject(numId),
    enabled: !!id,
    staleTime: 300_000,   // infos projet stables — 5 min
  });
  const { data: logsData } = useQuery({
    queryKey: ['daily-logs', numId],
    queryFn: () => getDailyLogs(numId),
    enabled: !!id,
    staleTime: 120_000,   // journaux quotidiens — 2 min
  });
  const logs    = logsData?.data ?? [];
  const logMeta = logsData?.meta ?? null;

  if (isLoading) return (
    <div className="project-detail">
      <div className="skeleton skeleton-hero" />
      <div className="skeleton-kpi-row">
        {[0,1,2,3].map(i => <div key={i} className="skeleton skeleton-kpi" />)}
      </div>
      <div className="skeleton skeleton-card" />
      <div className="skeleton skeleton-card" />
      <div className="skeleton skeleton-card" />
    </div>
  );
  if (isError || !project) return (
    <div className="page-content"><p className="form-error">Chantier introuvable.</p></div>
  );

  const avancement  = logMeta?.latest_progress ?? null;
  const incidents   = logMeta?.incident_count ?? 0;
  const jourssuivis = logMeta?.total_logs ?? 0;
  const daysLeft    = getDaysRemaining(project.end_date);
  const { title, sub } = splitHeroName(project.name);

  const delayLabel = daysLeft === null ? null
    : daysLeft < 0  ? `${Math.abs(daysLeft)} j de retard`
    : daysLeft === 0 ? "Aujourd'hui"
    : `${daysLeft} j restants`;

  const delayColor = daysLeft === null ? 'rgba(255,255,255,0.5)'
    : daysLeft < 0  ? '#f87171'
    : daysLeft <= 30 ? '#fbbf24'
    : '#34d399';

  // P1: distinguer "aucun journal" de "avancement calculé"
  const avancementLabel = avancement !== null
    ? `${avancement} %`
    : jourssuivis === 0 ? 'Aucun journal' : '—';

  // BTP: montant marché (contractuel) vs budget prévisionnel
  const montantMarche   = project.montant_marche ?? null;
  const budgetPrevision = project.budget_amount ? Number(project.budget_amount) : null;
  const ecartMarche     = montantMarche && budgetPrevision && budgetPrevision !== montantMarche
    ? budgetPrevision - montantMarche : null;

  // ── Section icons ────────────────────────────────────────────
  const icons = {
    courbeS:  <div className="card-icon card-icon--blue"><IcoChart /></div>,
    budget:   <div className="card-icon card-icon--green"><IcoMoney /></div>,
    dqe:      <div className="card-icon" style={{ background: '#f0fdf4' }}><span style={{ color: '#16a34a', display: 'flex' }}><IcoCheck /></span></div>,
    incident: <div className="card-icon" style={{ background: '#fef2f2' }}><span style={{ color: '#ef4444', display: 'flex' }}><IcoAlert /></span></div>,
    safety:   <div className="card-icon" style={{ background: '#fef2f2' }}><span style={{ color: '#ef4444', display: 'flex' }}><IcoShield /></span></div>,
    calendar: <div className="card-icon card-icon--orange"><IcoCal /></div>,
    gantt:    <div className="card-icon" style={{ background: '#ede9fe' }}><span style={{ color: '#7c3aed', display: 'flex' }}><IcoGantt /></span></div>,
    docs:     <div className="card-icon" style={{ background: '#ede9fe' }}><span style={{ color: '#7c3aed', display: 'flex' }}><IcoDoc /></span></div>,
    mat:      <div className="card-icon" style={{ background: '#fef9c3' }}><span style={{ color: '#ca8a04', display: 'flex' }}><IcoBox /></span></div>,
    photo:    <div className="card-icon card-icon--purple"><IcoPhoto /></div>,
    report:   <div className="card-icon card-icon--orange"><IcoDoc /></div>,
    team:     <div className="card-icon card-icon--teal"><IcoTeam /></div>,
    history:  <div className="card-icon card-icon--gray"><IcoClock /></div>,
  };

  // ── Membres réutilisable ─────────────────────────────────────
  const TeamTable = () => !project.members || project.members.length === 0
    ? <p className="empty-state">Aucun membre assigné.</p>
    : (
      <table className="data-table">
        <thead><tr><th>Nom</th><th>Rôle</th><th>Email</th></tr></thead>
        <tbody>
          {project.members.map(m => (
            <tr key={m.id}>
              <td style={{ fontWeight: 600 }}>{m.user.name}</td>
              <td><span className="badge badge-type-team">{ROLE_LABELS[m.assignment_role] ?? m.assignment_role}</span></td>
              <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{m.user.email}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );

  return (
    <div className="project-detail">

      {/* ── Hero condensé : 3 éléments essentiels ── */}
      <div className="proj-hero">
        <Link to="/projects" className="proj-hero__back">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><path d="M19 12H5"/><polyline points="12 19 5 12 12 5"/></svg>
          Retour aux chantiers
        </Link>

        <div className="proj-hero__body">
          <div className="proj-hero__left">
            <div className="proj-hero__badges">
              <span className="proj-hero__code">{project.code}</span>
              <span className="proj-hero__status" style={{ background: `${STATUS_COLOR[project.status]}22`, color: STATUS_COLOR[project.status], borderColor: `${STATUS_COLOR[project.status]}44` }}>
                {STATUS_LABELS[project.status] ?? project.status}
              </span>
              {project.type_marche && (
                <span className="proj-hero__status" style={{ background: '#1e293b', color: '#94a3b8', borderColor: '#334155' }}>
                  {TYPE_MARCHE_LABELS[project.type_marche] ?? project.type_marche}
                </span>
              )}
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
              {project.maitre_ouvrage && (
                <span className="proj-hero__chip">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="12" height="12"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                  MO : {project.maitre_ouvrage}
                </span>
              )}
              {project.maitre_oeuvre && (
                <span className="proj-hero__chip">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="12" height="12"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                  MOE : {project.maitre_oeuvre}
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
              {project.date_reception_provisoire && (
                <span className="proj-hero__chip" style={{ borderColor: '#34d39955', color: '#34d399' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="12" height="12"><path d="M9 11l3 3L22 4"/></svg>
                  Réception prov. {formatDate(project.date_reception_provisoire)}
                </span>
              )}
            </div>
          </div>

          <div className="proj-hero__right">
            {/* Budget BTP : montant marché (contractuel) en priorité */}
            <div className="proj-hero__budget-block">
              {montantMarche ? (
                <>
                  <span className="proj-hero__budget-label">Montant marché</span>
                  <span className="proj-hero__budget-value">{formatBudget(montantMarche)}</span>
                  {budgetPrevision && budgetPrevision !== montantMarche && (
                    <span className="proj-hero__budget-sub" style={{ color: ecartMarche && ecartMarche > 0 ? '#fbbf24' : '#94a3b8' }}>
                      Budget prév. {formatBudget(budgetPrevision)}
                      {ecartMarche && ecartMarche > 0 && ` · +${formatBudget(ecartMarche)} avenants`}
                    </span>
                  )}
                </>
              ) : (
                <>
                  <span className="proj-hero__budget-label">Budget prévisionnel</span>
                  <span className="proj-hero__budget-value">{formatBudget(project.budget_amount)}</span>
                </>
              )}
            </div>
            <div className="proj-hero__right-bottom">
              {delayLabel && (
                <div className="proj-hero__delay" style={{ color: delayColor, borderColor: `${delayColor}44` }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  {delayLabel}
                </div>
              )}
              <HealthScoreBadge projectId={project.id} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Barre d'actions (séparée du hero) ── */}
      <div className="proj-action-bar">
        <button type="button" className="proj-action-bar__btn" onClick={handleExportPdf} disabled={exportingPdf}>
          <IcoDoc />
          {exportingPdf ? 'Génération…' : 'Exporter rapport'}
        </button>
        {isManagement && (
          <>
            <button className="proj-action-bar__btn" onClick={() => setShowMeetingModal(true)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
              CR Réunion IA
            </button>
            <button className="proj-action-bar__btn" onClick={() => setShowSituationModal(true)}>
              <IcoCheck />
              Situation Travaux IA
            </button>
            <Link to={`/projects/${project.id}/accounting`} className="proj-action-bar__btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
              Comptabilité
            </Link>
          </>
        )}
      </div>

      {showMeetingModal && <MeetingReportModal projectId={project.id} onClose={() => setShowMeetingModal(false)} />}
      {showSituationModal && <SituationTravauxModal projectId={project.id} onClose={() => setShowSituationModal(false)} />}

      {/* ── KPI strip — ordre pilotage BTP ── */}
      <div className="proj-kpi-row">

        {/* KPI 1 (primaire) : Avancement réel */}
        <div className="proj-kpi proj-kpi--primary">
          <div className="proj-kpi__icon proj-kpi__icon--blue"><IcoChart /></div>
          <div className="proj-kpi__body">
            <span className="proj-kpi__value" style={{ color: avancement !== null ? '#3b7ddd' : 'var(--text-muted)' }}>
              {avancementLabel}
            </span>
            <span className="proj-kpi__label">Avancement réel</span>
            {avancement !== null && (
              <div className="proj-kpi__bar">
                <div className="proj-kpi__bar-fill" style={{ width: `${avancement}%`, background: '#3b7ddd' }} />
              </div>
            )}
          </div>
        </div>

        {/* KPI 2 : Délai contractuel */}
        <div className="proj-kpi">
          <div className="proj-kpi__icon proj-kpi__icon--orange"><IcoCal /></div>
          <div className="proj-kpi__body">
            <span className="proj-kpi__value" style={{ color: daysLeft === null ? 'var(--text-muted)' : delayColor }}>
              {delayLabel ?? 'Fin non définie'}
            </span>
            <span className="proj-kpi__label">Délai contractuel</span>
          </div>
        </div>

        {/* KPI 3 : Budget marché (DG/DT) ou Journaux saisis (terrain) */}
        {isDGDT ? (
          <div className="proj-kpi">
            <div className="proj-kpi__icon proj-kpi__icon--green"><IcoMoney /></div>
            <div className="proj-kpi__body">
              <span className="proj-kpi__value" style={{ color: '#10b981', fontSize: 14 }}>
                {montantMarche ? formatBudget(montantMarche) : formatBudget(project.budget_amount)}
              </span>
              <span className="proj-kpi__label">{montantMarche ? 'Montant marché' : 'Budget prévisionnel'}</span>
              {ecartMarche && ecartMarche > 0 && (
                <span style={{ color: '#fbbf24', fontSize: 11, marginTop: 2, display: 'block' }}>
                  +{formatBudget(ecartMarche)} avenants
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="proj-kpi">
            <div className="proj-kpi__icon proj-kpi__icon--teal"><IcoDoc /></div>
            <div className="proj-kpi__body">
              <span className="proj-kpi__value" style={{ color: '#1abc9c' }}>{jourssuivis}</span>
              <span className="proj-kpi__label">Journaux saisis</span>
            </div>
          </div>
        )}

        {/* KPI 4 : Incidents */}
        <div className="proj-kpi">
          <div className={`proj-kpi__icon ${incidents > 0 ? 'proj-kpi__icon--red' : 'proj-kpi__icon--green'}`}><IcoAlert /></div>
          <div className="proj-kpi__body">
            <span className="proj-kpi__value" style={{ color: incidents > 0 ? '#ef4444' : '#10b981' }}>{incidents}</span>
            <span className="proj-kpi__label">Incidents signalés</span>
          </div>
        </div>
      </div>

      {isDGDT ? (
        /* ════════════════════════════════════════════════════════
           VUE DG / DT — ordre réunion CT
           1. Courbe S + Trésorerie (pilotage technique + financier)
           2. DQE
           3. Incidents + Sécurité côte à côte
           4. Journaux (référence régularité)
           5. Planning Gantt
           6. Matériaux / Photos / Documents / Rapports
           7. Équipe + Historique
        ════════════════════════════════════════════════════════ */
        <>
          {/* 1a. Courbe S */}
          {project.start_date && project.end_date && (
            <CollapsibleSection
              title="Courbe S — Avancement réel vs théorique"
              subtitle="Progression cumulée depuis le début du chantier"
              defaultOpen
              icon={icons.courbeS}
            >
              <SCurveChart logs={logs} startDate={project.start_date} endDate={project.end_date} targetProgress={project.target_progress ?? 100} />
            </CollapsibleSection>
          )}

          {/* 1b. Trésorerie */}
          <CollapsibleSection
            title="Trésorerie prévisionnelle — 90 jours"
            subtitle="Budget prévisionnel, engagements, décaissements — retenue de garantie 5 %"
            defaultOpen
            icon={icons.budget}
          >
            <BudgetPanel projectId={project.id} />
          </CollapsibleSection>

          {/* 2. DQE */}
          <CollapsibleSection
            title="Décompte Quantitatif Estimatif (DQE)"
            subtitle="Versions, lignes, lots — base contractuelle du chantier"
            defaultOpen
            icon={icons.dqe}
          >
            <DqePanel projectId={project.id} />
          </CollapsibleSection>

          {/* 3. Incidents + Score Sécurité côte à côte */}
          <div className="detail-grid">
            <CollapsibleSection
              className="col-half"
              title="Incidents chantier"
              subtitle="Incidents déclarés — classés par gravité"
              defaultOpen
              icon={icons.incident}
            >
              <IncidentPanel projectId={project.id} />
            </CollapsibleSection>
            <CollapsibleSection
              className="col-half"
              title="Score Sécurité Mensuel"
              subtitle="Incidents pondérés par gravité — ce mois"
              defaultOpen
              icon={icons.safety}
            >
              <SafetyScoreWidget projectId={project.id} />
            </CollapsibleSection>
          </div>

          {/* 4. Journaux (collapsé — référence régularité DG/DT) */}
          <CollapsibleSection
            id="journal-section"
            title="Rapports journaliers"
            subtitle="Régularité de saisie terrain — calendrier mensuel"
            icon={icons.calendar}
          >
            <LogCalendar logs={logs} meta={logMeta} projectId={project.id} />
          </CollapsibleSection>

          {/* 5. Planning */}
          <CollapsibleSection
            title="Planning phases BTP"
            subtitle="Distribution estimée selon la répartition standard BTP"
            icon={icons.gantt}
          >
            <PhaseGanttWidget project={project} progressPercent={avancement} />
          </CollapsibleSection>

          {/* 6a. Réceptions matériaux */}
          <CollapsibleSection
            title="Réceptions matériaux"
            subtitle="Totaux et historique des livraisons"
            icon={icons.mat}
          >
            <MaterialReceiptsPanel projectId={project.id} />
          </CollapsibleSection>

          {/* 6b. Galerie photos */}
          <CollapsibleSection
            title="Galerie photos terrain"
            subtitle="Photos taguées par phase"
            icon={icons.photo}
          >
            <PhotoGallery projectId={project.id} />
          </CollapsibleSection>

          {/* 6c. Documents contractuels (consultation ponctuelle → en bas) */}
          <CollapsibleSection
            title="Documents du chantier"
            subtitle="Appel d'offres, ordre de service, marché, contrats et plans"
            icon={icons.docs}
          >
            <ProjectDocumentsPanel projectId={project.id} />
          </CollapsibleSection>

          {/* 6d. Rapports hebdomadaires */}
          <CollapsibleSection
            title="Rapports hebdomadaires"
            subtitle="Archives générées automatiquement — téléchargeables"
            icon={icons.report}
            extra={<WhatsAppTestButton projectId={project.id} />}
          >
            <ReportsWidget projectId={project.id} />
          </CollapsibleSection>

          {/* 7. Équipe + Historique */}
          <div className="detail-grid">
            <CollapsibleSection className="col-half" title="Équipe du chantier" icon={icons.team}>
              <TeamTable />
            </CollapsibleSection>
            <CollapsibleSection className="col-half card--activity" title="Historique des actions" icon={icons.history}>
              <ActivityTimeline activities={project.activities ?? []} />
            </CollapsibleSection>
          </div>
        </>
      ) : (
        /* ════════════════════════════════════════════════════════
           VUE TERRAIN / AUTRES — ordre opérationnel quotidien
        ════════════════════════════════════════════════════════ */
        <>
          <CollapsibleSection
            title="Documents du chantier"
            subtitle="Appel d'offres, ordre de service, marché, contrats et plans"
            defaultOpen
            icon={icons.docs}
          >
            <ProjectDocumentsPanel projectId={project.id} />
          </CollapsibleSection>

          <CollapsibleSection
            id="journal-section"
            title="Rapports journaliers"
            subtitle="Calendrier mensuel — cliquer un jour pour voir le détail"
            defaultOpen
            icon={icons.calendar}
          >
            <LogCalendar logs={logs} meta={logMeta} projectId={project.id} />
          </CollapsibleSection>

          <CollapsibleSection title="Incidents chantier" subtitle="Incidents déclarés — classés par gravité" icon={icons.incident}>
            <IncidentPanel projectId={project.id} />
          </CollapsibleSection>

          <CollapsibleSection title="Score Sécurité Mensuel" subtitle="Basé sur les incidents déclarés ce mois" icon={icons.safety}>
            <SafetyScoreWidget projectId={project.id} />
          </CollapsibleSection>

          {project.start_date && project.end_date && (
            <CollapsibleSection title="Courbe S — Avancement réel vs théorique" subtitle="Progression cumulée depuis le début du chantier" icon={icons.courbeS}>
              <SCurveChart logs={logs} startDate={project.start_date} endDate={project.end_date} targetProgress={project.target_progress ?? 100} />
            </CollapsibleSection>
          )}

          {isManagement && (
            <CollapsibleSection title="Trésorerie prévisionnelle — 90 jours" subtitle="Budget prévisionnel, engagements et décaissements" icon={icons.budget}>
              <BudgetPanel projectId={project.id} />
            </CollapsibleSection>
          )}

          <CollapsibleSection title="Décompte Quantitatif Estimatif (DQE)" subtitle="Versions, lignes, lots — base contractuelle" icon={icons.dqe}>
            <DqePanel projectId={project.id} />
          </CollapsibleSection>

          <CollapsibleSection title="Planning phases BTP" subtitle="Distribution estimée selon la répartition standard BTP" icon={icons.gantt}>
            <PhaseGanttWidget project={project} progressPercent={avancement} />
          </CollapsibleSection>

          <CollapsibleSection title="Réceptions matériaux" subtitle="Totaux et historique des livraisons" icon={icons.mat}>
            <MaterialReceiptsPanel projectId={project.id} />
          </CollapsibleSection>

          <CollapsibleSection title="Galerie photos terrain" subtitle="Photos taguées par phase — glisser-déposer pour ajouter" icon={icons.photo}>
            <PhotoGallery projectId={project.id} />
          </CollapsibleSection>

          <CollapsibleSection
            title="Rapports hebdomadaires"
            subtitle="Archives générées automatiquement"
            icon={icons.report}
            extra={<WhatsAppTestButton projectId={project.id} />}
          >
            <ReportsWidget projectId={project.id} />
          </CollapsibleSection>

          <div className="detail-grid">
            <CollapsibleSection className="col-half" title="Équipe du chantier" icon={icons.team}>
              <TeamTable />
            </CollapsibleSection>
            <CollapsibleSection className="col-half card--activity" title="Historique des actions" icon={icons.history}>
              <ActivityTimeline activities={project.activities ?? []} />
            </CollapsibleSection>
          </div>
        </>
      )}

      <TerrainFAB targetId="journal-section" />
    </div>
  );
}
