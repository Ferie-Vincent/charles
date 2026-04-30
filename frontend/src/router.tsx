import { createBrowserRouter, Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import AppShell from './components/layout/AppShell';
import ProtectedRoute from './components/guards/ProtectedRoute';
import LoginPage from './features/auth/pages/LoginPage';
import DashboardPage from './features/dashboard/pages/DashboardPage';
import ProjectsPage from './features/projects/pages/ProjectsPage';
import NewProjectPage from './features/projects/pages/NewProjectPage';
import { useAuth } from './features/auth/stores/auth-store';

function Shell({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  return (
    <ProtectedRoute isAuthenticated={isAuthenticated}>
      <AppShell>{children}</AppShell>
    </ProtectedRoute>
  );
}

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/', element: <Shell><DashboardPage /></Shell> },
  { path: '/projects', element: <Shell><ProjectsPage /></Shell> },
  { path: '/projects/new', element: <Shell><NewProjectPage /></Shell> },
  { path: '*', element: <Navigate to="/" replace /> },
]);
