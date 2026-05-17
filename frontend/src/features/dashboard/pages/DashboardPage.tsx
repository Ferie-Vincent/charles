import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { getDashboard, type SituationCtPending } from '../api/get-dashboard';
import SkeletonPage from '../../../components/ui/SkeletonPage';
import { useAuth } from '../../auth/stores/auth-store';
import { getRoleGroup, type RoleGroup, ACTIVITY_FEED_FILTER } from '../../../lib/roles';
import { fmtFCFA } from '../../../lib/formatters';
import PageHeader from '../../../components/ui/PageHeader';
import KpiBar from '../components/KpiBar';
import IndicateursChantiers from '../components/IndicateursChantiers';
import DashboardCharts, { BudgetBarsCard, CriticitéCard } from '../components/DashboardCharts';
import AlertsPanel from '../components/AlertsPanel';
import PortfolioPanel from '../components/PortfolioPanel';
import AiAnalysisWidget from '../components/AiAnalysisWidget';
import AiMorningBriefing from '../../ai/components/AiMorningBriefing';
import ActivityFeed from '../components/ActivityFeed';
import ProjectList from '../components/ProjectList';
import QuickActions from '../components/QuickActions';

function SituationsCtBanner({ situations }: { situations: SituationCtPending[] }) {
  if (situations.length === 0) return null;
  return (
    <div style={{
      background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8,
      padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12,
    }}>
      <span style={{ fontSize: '1.1rem' }}>📋</span>
      <div style={{ flex: 1 }}>
        <strong style={{ color: '#1d4ed8' }}>
          {situations.length} situation{situations.length > 1 ? 's' : ''} en attente de votre validation CT
        </strong>
        <div style={{ fontSize: '0.8rem', color: '#3b82f6', marginTop: 2 }}>
          {situations.map(s => (
            <Link key={s.id} to={`/projects/${s.project_id}/situations`}
              style={{ marginRight: 12, color: '#2563eb', textDecoration: 'none', fontWeight: 600 }}>
              {s.project_code} — {fmtFCFA(s.net_a_payer)} FCFA →
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

const ROLE_HEADER: Record<RoleGroup, { breadcrumb: string; title: string; subtitle: string }> = {
  direction: {
    breadcrumb: 'DIRECTION GÉNÉRALE · 2026',
    title: 'Portefeuille chantiers',
    subtitle: 'Vue consolidée des chantiers actifs, budgets et alertes terrain.',
  },
  dt: {
    breadcrumb: 'DIRECTION TECHNIQUE · 2026',
    title: 'Tableau de bord — DT',
    subtitle: 'Vue opérationnelle : DQE, achats, avancements et alertes chantier.',
  },
  conducteur: {
    breadcrumb: 'CONDUCTEUR DE TRAVAUX · 2026',
    title: 'Mes chantiers',
    subtitle: 'Supervision terrain : avancements, QHSE, plannings et alertes.',
  },
  terrain: {
    breadcrumb: 'TERRAIN · 2026',
    title: 'Mes chantiers',
    subtitle: 'Alertes actives, positions et accès rapide au journal du jour.',
  },
  metreur: {
    breadcrumb: 'MÉTREUR-ÉCONOMISTE · 2026',
    title: 'Tableau de bord — Métreur',
    subtitle: 'Synthèse DQE, avancements et indicateurs chantiers.',
  },
  comptable: {
    breadcrumb: 'COMPTABILITÉ · 2026',
    title: 'Tableau de bord — Comptabilité',
    subtitle: 'Synthèse budgétaire, factures et indicateurs financiers.',
  },
  logistique: {
    breadcrumb: 'LOGISTIQUE · 2026',
    title: 'Tableau de bord — Logistique',
    subtitle: 'Achats, stocks et demandes de matériaux en cours.',
  },
  lecture: {
    breadcrumb: 'LECTURE SEULE · 2026',
    title: 'Tableau de bord',
    subtitle: 'Vue en lecture du portefeuille chantiers.',
  },
};

export default function DashboardPage() {
  const { user } = useAuth();
  const { data, isLoading, isError, dataUpdatedAt } = useQuery({
    queryKey: ['dashboard'],
    queryFn: getDashboard,
    staleTime: 60_000,
  });

  if (isLoading) return <div className="page-content"><SkeletonPage rows={4} /></div>;
  if (isError || !data) return <div className="page-content"><p className="form-error">Erreur de chargement.</p></div>;

  const { stats, active_projects, recent_activities, alerts, situations_en_revue_ct } = data;
  const roleGroup = getRoleGroup(user?.role?.name ?? '');
  const header = ROLE_HEADER[roleGroup];

  const syncLabel = dataUpdatedAt
    ? `Synchronisé à ${new Date(dataUpdatedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
    : 'Synchronisation…';

  return (
    <div>
      <PageHeader
        breadcrumb={header.breadcrumb}
        title={header.title}
        subtitle={header.subtitle}
        syncLabel={syncLabel}
      />

      <KpiBar stats={stats} roleGroup={roleGroup} />

      {roleGroup === 'direction' && (
        <>
          <AiMorningBriefing />
          <div className="db-sidebar-grid">
            <div className="db-sidebar-grid__main">
              <CriticitéCard activeProjects={active_projects} />
              <BudgetBarsCard activeProjects={active_projects} />
            </div>
            <div className="db-sidebar-grid__side">
              <AlertsPanel alerts={alerts ?? []} />
              <AiAnalysisWidget />
            </div>
          </div>
          <PortfolioPanel projects={active_projects} />
          <ActivityFeed activities={recent_activities} />
        </>
      )}

      {roleGroup === 'dt' && (
        <>
          <AiMorningBriefing />
          <div className="db-sidebar-grid">
            <div className="db-sidebar-grid__main">
              <CriticitéCard activeProjects={active_projects} />
              <BudgetBarsCard activeProjects={active_projects} />
            </div>
            <div className="db-sidebar-grid__side">
              <AlertsPanel alerts={alerts ?? []} />
            </div>
          </div>
          <PortfolioPanel projects={active_projects} />
          <ActivityFeed activities={recent_activities} filter={ACTIVITY_FEED_FILTER[roleGroup]} />
        </>
      )}

      {roleGroup === 'conducteur' && (
        <>
          <SituationsCtBanner situations={situations_en_revue_ct ?? []} />
          <div className="db-sidebar-grid">
            <div className="db-sidebar-grid__main">
              <CriticitéCard activeProjects={active_projects} />
              <BudgetBarsCard activeProjects={active_projects} />
            </div>
            <div className="db-sidebar-grid__side">
              <AlertsPanel alerts={alerts ?? []} />
            </div>
          </div>
          <PortfolioPanel projects={active_projects} />
          <ActivityFeed activities={recent_activities} filter={ACTIVITY_FEED_FILTER[roleGroup]} />
        </>
      )}

      {roleGroup === 'terrain' && (
        <>
          <div className="terrain-top-grid">
            <AlertsPanel alerts={alerts ?? []} />
            <ProjectList
              projects={active_projects}
              subtitle={`Journal du jour — ${new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`}
              ctaLabel="Saisir journal"
              ctaTo={id => `/projects/${id}/journal`}
              showHealthScore
            />
          </div>
          <PortfolioPanel projects={active_projects} showTimeline={false} />
        </>
      )}

      {roleGroup === 'metreur' && (
        <>
          <AlertsPanel alerts={alerts ?? []} />
          <QuickActions links={[
            { label: 'DQE Portefeuille', sub: 'Versions & lots', to: '/portfolio/dqe', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg> },
            { label: 'Achats / BDC', sub: 'Commandes en cours', to: '/achats', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg> },
            { label: 'Chantiers', sub: 'Voir tous les projets', to: '/projects', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg> },
          ]} />
          <DashboardCharts activeProjects={active_projects} />
          <ActivityFeed activities={recent_activities} filter={ACTIVITY_FEED_FILTER[roleGroup]} />
        </>
      )}

      {roleGroup === 'comptable' && (
        <>
          {(stats.invoices_pending_count ?? 0) > 0 && (
            <div style={{
              background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8,
              padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <span style={{ fontSize: '1.1rem' }}>🧾</span>
              <strong style={{ color: '#92400e', flex: 1 }}>
                {stats.invoices_pending_count} facture{stats.invoices_pending_count > 1 ? 's' : ''} en attente de validation
              </strong>
              <Link to="/accounting" style={{ color: '#b45309', fontWeight: 600, textDecoration: 'none', fontSize: '0.85rem' }}>
                Voir →
              </Link>
            </div>
          )}
          <AlertsPanel alerts={alerts ?? []} />
          <QuickActions links={[
            { label: 'Comptabilité', sub: 'Factures & fournisseurs', to: '/accounting', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> },
            { label: 'Demandes besoin', sub: 'À comptabiliser', to: '/achats', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg> },
            { label: 'Dépenses générales', sub: 'Charges & frais', to: '/accounting', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg> },
          ]} />
          <ActivityFeed activities={recent_activities} filter={ACTIVITY_FEED_FILTER[roleGroup]} />
        </>
      )}

      {roleGroup === 'logistique' && (
        <>
          <QuickActions links={[
            { label: 'Bons de commande', sub: 'Préparer & réceptionner', to: '/achats',    color: 'card-icon--orange', icon: <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg> },
            { label: 'Stocks',          sub: 'Niveaux & mouvements',     to: '/stocks',    color: 'card-icon--blue',   icon: <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg> },
            { label: 'Demandes besoin', sub: 'À préparer & livrer',      to: '/besoins',   color: 'card-icon--green',  icon: <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg> },
            { label: 'Fournisseurs',    sub: 'Annuaire & contacts',      to: '/suppliers', color: 'card-icon--purple', icon: <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
          ]} />
          <div className="db-top-row" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <ProjectList
              projects={active_projects}
              subtitle="Sites à approvisionner"
              ctaLabel="Voir chantier"
              ctaTo={id => `/projects/${id}`}
              variant="view"
              compact
            />
            <ActivityFeed
              activities={recent_activities}
              filter={ACTIVITY_FEED_FILTER[roleGroup]}
              compact
            />
          </div>
        </>
      )}

      {roleGroup === 'lecture' && (
        <>
          <IndicateursChantiers projects={active_projects} />
          <DashboardCharts activeProjects={active_projects} />
        </>
      )}
    </div>
  );
}
