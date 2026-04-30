import { createBrowserRouter, Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import AppShell from './components/layout/AppShell';
import LoginPage from './features/auth/pages/LoginPage';
import DashboardPage from './features/dashboard/pages/DashboardPage';
import ProjectsPage from './features/projects/pages/ProjectsPage';
import NewProjectPage from './features/projects/pages/NewProjectPage';

function Shell({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/', element: <Shell><DashboardPage /></Shell> },
  { path: '/projects', element: <Shell><ProjectsPage /></Shell> },
  { path: '/projects/new', element: <Shell><NewProjectPage /></Shell> },
  { path: '*', element: <Navigate to="/" replace /> },
]);
