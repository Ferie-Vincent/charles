import { createBrowserRouter, Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import AppShell from './components/layout/AppShell';
import RoleGuard from './components/guards/RoleGuard';
import { useAuth } from './features/auth/stores/auth-store';
import { getRoleGroup } from './lib/roles';
import LoginPage from './features/auth/pages/LoginPage';
import DashboardPage from './features/dashboard/pages/DashboardPage';
import OperationsDashboardPage from './features/operations/pages/OperationsDashboardPage';
import ProjectsPage from './features/projects/pages/ProjectsPage';
import NewProjectPage from './features/projects/pages/NewProjectPage';
import ProjectDetailPage from './features/projects/pages/ProjectDetailPage';
import JournalPage from './features/projects/pages/JournalPage';
import MapPage from './features/map/pages/MapPage';
import TimelinePage from './features/timeline/pages/TimelinePage';
import EvaluationPage from './features/evaluation/pages/EvaluationPage';
import QhsePage from './features/qhse/pages/QhsePage';
import CostsPage from './features/costs/pages/CostsPage';
import ReportingPage from './features/reporting/pages/ReportingPage';
import DqePage from './features/dqe/pages/DqePage';
import DqeEditorPage from './features/dqe/pages/DqeEditorPage';
import UsersPage from './features/users/pages/UsersPage';
import PermissionsPage from './features/permissions/pages/PermissionsPage';
import ProjectAccountingPage from './features/accounting/pages/ProjectAccountingPage';
import AccountingDashboardPage from './features/accounting/pages/AccountingDashboardPage';
import SuppliersPage from './features/suppliers/pages/SuppliersPage';
import StocksPage from './features/stocks/pages/StocksPage';
import AchatsPage from './features/achats/pages/AchatsPage';
import GedPage from './features/ged/pages/GedPage';
import BesoinsPage from './features/besoins/pages/BesoinsPage';
import ProfilePage from './features/profile/pages/ProfilePage';
import SettingsPage from './features/settings/pages/SettingsPage';
import TasksPage from './features/tasks/pages/TasksPage';

function Shell({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}

function RootPage() {
  const { user } = useAuth();
  if (getRoleGroup(user?.role?.name ?? '') === 'dt') return <OperationsDashboardPage />;
  return <DashboardPage />;
}

function Guarded({ path, children }: { path: string; children: ReactNode }) {
  return (
    <Shell>
      <RoleGuard path={path}>{children}</RoleGuard>
    </Shell>
  );
}

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/',                         element: <Shell><RootPage /></Shell> },
  { path: '/operations',               element: <Guarded path="/operations"><OperationsDashboardPage /></Guarded> },
  { path: '/projects',                 element: <Shell><ProjectsPage /></Shell> },
  { path: '/projects/new',             element: <Shell><NewProjectPage /></Shell> },
  { path: '/projects/:id',             element: <Shell><ProjectDetailPage /></Shell> },
  { path: '/projects/:id/journal',     element: <Shell><JournalPage /></Shell> },
  { path: '/projects/:id/accounting',  element: <Guarded path="/costs"><ProjectAccountingPage /></Guarded> },
  { path: '/map',                      element: <Guarded path="/map"><MapPage /></Guarded> },
  { path: '/timeline',                 element: <Guarded path="/timeline"><TimelinePage /></Guarded> },
  { path: '/dqe',                      element: <Guarded path="/dqe"><DqePage /></Guarded> },
  { path: '/projects/:id/dqe/:versionId', element: <Guarded path="/dqe"><DqeEditorPage /></Guarded> },
  { path: '/execution',                element: <Guarded path="/execution"><EvaluationPage /></Guarded> },
  { path: '/costs',                    element: <Guarded path="/costs"><CostsPage /></Guarded> },
  { path: '/accounting',              element: <Guarded path="/accounting"><AccountingDashboardPage /></Guarded> },
  { path: '/suppliers',               element: <Guarded path="/suppliers"><SuppliersPage /></Guarded> },
  { path: '/achats',                  element: <Guarded path="/achats"><AchatsPage /></Guarded> },
  { path: '/stocks',                  element: <Guarded path="/stocks"><StocksPage /></Guarded> },
  { path: '/ged',                     element: <Guarded path="/ged"><GedPage /></Guarded> },
  { path: '/besoins',                  element: <Guarded path="/besoins"><BesoinsPage /></Guarded> },
  { path: '/qse',                      element: <Guarded path="/qse"><QhsePage /></Guarded> },
  { path: '/reporting',                element: <Guarded path="/reporting"><ReportingPage /></Guarded> },
  { path: '/users',                    element: <Guarded path="/users"><UsersPage /></Guarded> },
  { path: '/permissions',              element: <Guarded path="/users"><PermissionsPage /></Guarded> },
  { path: '/tasks',                     element: <Shell><TasksPage /></Shell> },
  { path: '/profile',                  element: <Shell><ProfilePage /></Shell> },
  { path: '/settings',                 element: <Shell><SettingsPage /></Shell> },
  { path: '*',                         element: <Navigate to="/" replace /> },
]);
