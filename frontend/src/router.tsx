import { createBrowserRouter, Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import AppShell from './components/layout/AppShell';
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

function Shell({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/', element: <Shell><DashboardPage /></Shell> },
  { path: '/projects', element: <Shell><ProjectsPage /></Shell> },
  { path: '/projects/new', element: <Shell><NewProjectPage /></Shell> },
  { path: '/projects/:id', element: <Shell><ProjectDetailPage /></Shell> },
  { path: '/projects/:id/journal', element: <Shell><JournalPage /></Shell> },
  { path: '/map', element: <Shell><MapPage /></Shell> },
  { path: '/timeline', element: <Shell><TimelinePage /></Shell> },
  { path: '/execution', element: <Shell><EvaluationPage /></Shell> },
  { path: '/qse', element: <Shell><QhsePage /></Shell> },
  { path: '/costs', element: <Shell><CostsPage /></Shell> },
  { path: '/reporting', element: <Shell><ReportingPage /></Shell> },
  { path: '/dqe', element: <Shell><DqePage /></Shell> },
  { path: '/projects/:id/dqe/:versionId', element: <Shell><DqeEditorPage /></Shell> },
  { path: '*', element: <Navigate to="/" replace /> },
]);
