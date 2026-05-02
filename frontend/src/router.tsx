import { createBrowserRouter, Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import AppShell from './components/layout/AppShell';
import RoleGuard from './components/guards/RoleGuard';
import LoginPage from './features/auth/pages/LoginPage';
import DashboardPage from './features/dashboard/pages/DashboardPage';
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

function Shell({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
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
  { path: '/',                         element: <Shell><DashboardPage /></Shell> },
  { path: '/projects',                 element: <Shell><ProjectsPage /></Shell> },
  { path: '/projects/new',             element: <Shell><NewProjectPage /></Shell> },
  { path: '/projects/:id',             element: <Shell><ProjectDetailPage /></Shell> },
  { path: '/projects/:id/journal',     element: <Shell><JournalPage /></Shell> },
  { path: '/map',                      element: <Guarded path="/map"><MapPage /></Guarded> },
  { path: '/timeline',                 element: <Guarded path="/timeline"><TimelinePage /></Guarded> },
  { path: '/dqe',                      element: <Guarded path="/dqe"><DqePage /></Guarded> },
  { path: '/projects/:id/dqe/:versionId', element: <Guarded path="/dqe"><DqeEditorPage /></Guarded> },
  { path: '/execution',                element: <Guarded path="/execution"><EvaluationPage /></Guarded> },
  { path: '/costs',                    element: <Guarded path="/costs"><CostsPage /></Guarded> },
  { path: '/qse',                      element: <Guarded path="/qse"><QhsePage /></Guarded> },
  { path: '/reporting',                element: <Guarded path="/reporting"><ReportingPage /></Guarded> },
  { path: '/users',                    element: <Guarded path="/users"><UsersPage /></Guarded> },
  { path: '*',                         element: <Navigate to="/" replace /> },
]);
