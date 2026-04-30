import { createBrowserRouter } from 'react-router-dom';
import AppShell from './components/layout/AppShell';
import ProtectedRoute from './components/guards/ProtectedRoute';
import LoginPage from './features/auth/pages/LoginPage';
import DashboardPage from './features/dashboard/pages/DashboardPage';
import ProjectsPage from './features/projects/pages/ProjectsPage';
import NewProjectPage from './features/projects/pages/NewProjectPage';
import { authState } from './features/auth/stores/auth-store';

function isAuth() {
  return authState.isAuthenticated;
}

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: (
      <ProtectedRoute isAuthenticated={isAuth()}>
        <AppShell>
          <DashboardPage />
        </AppShell>
      </ProtectedRoute>
    ),
  },
  {
    path: '/projects',
    element: (
      <ProtectedRoute isAuthenticated={isAuth()}>
        <AppShell>
          <ProjectsPage />
        </AppShell>
      </ProtectedRoute>
    ),
  },
  {
    path: '/projects/new',
    element: (
      <ProtectedRoute isAuthenticated={isAuth()}>
        <AppShell>
          <NewProjectPage />
        </AppShell>
      </ProtectedRoute>
    ),
  },
]);
