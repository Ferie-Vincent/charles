import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '../../features/auth/stores/auth-store';
import { getRoleGroup, canAccess } from '../../lib/roles';

interface Props {
  path: string;
  children: ReactNode;
}

export default function RoleGuard({ path, children }: Props) {
  const { user } = useAuth();
  const group = getRoleGroup(user?.role?.name ?? '');

  if (!canAccess(path, group)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
