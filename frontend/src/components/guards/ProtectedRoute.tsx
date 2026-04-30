import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';

type ProtectedRouteProps = {
  isAuthenticated: boolean;
  children: ReactNode;
};

export default function ProtectedRoute({ isAuthenticated, children }: ProtectedRouteProps) {
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}
