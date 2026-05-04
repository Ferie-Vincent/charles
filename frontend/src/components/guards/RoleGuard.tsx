import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '../../features/auth/stores/auth-store';
import { getRoleGroup } from '../../lib/roles';
import { usePermissions } from '../../lib/permissions-context';

// Pages that are never feature-gated (always accessible to authenticated users)
const OPEN_PATHS = ['/', '/projects', '/projects/new'];

interface Props {
  path: string;
  children: ReactNode;
}

export default function RoleGuard({ path, children }: Props) {
  const { user } = useAuth();
  const { canAccess, loaded } = usePermissions();
  const group = getRoleGroup(user?.role?.name ?? '');

  // direction and dt are LOCKED — bypass loading wait (myFeatures = all-true)
  if (OPEN_PATHS.includes(path) || group === 'direction' || group === 'dt') return <>{children}</>;
  if (!loaded) return null;

  // Extract feature key from path (/map → map, /qse → qse, etc.)
  const feature = path.replace('/', '');

  if (!canAccess(feature, group)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
