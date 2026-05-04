import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '../../features/auth/stores/auth-store';
import { getRoleGroup, canAccess as roleAccess } from '../../lib/roles';
import { usePermissions } from '../../lib/permissions-context';

const OPEN_PATHS = ['/', '/projects', '/projects/new'];

interface Props {
  path: string;
  children: ReactNode;
}

export default function RoleGuard({ path, children }: Props) {
  const { user } = useAuth();
  const { canAccess, loaded } = usePermissions();
  const group = getRoleGroup(user?.role?.name ?? '');

  // Static ROLE_ACCESS check runs first — catches /users (direction-only), /permissions, etc.
  if (!OPEN_PATHS.includes(path) && !roleAccess(path, group)) {
    return <Navigate to="/" replace />;
  }

  // LOCKED roles skip DB-permission loading wait (myFeatures = all-true from backend)
  if (OPEN_PATHS.includes(path) || group === 'direction' || group === 'dt') return <>{children}</>;
  if (!loaded) return null;

  const feature = path.replace('/', '');
  if (!canAccess(feature, group)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
