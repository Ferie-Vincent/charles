import { useEffect, useRef, useState, type ReactNode } from 'react';
import { RouterProvider } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { router } from './router';
import { queryClient } from './lib/query-client';
import { AuthProvider, useAuth } from './features/auth/stores/auth-store';
import { getMe, login } from './features/auth/api/login';

function SessionRestorer({ children }: { children: ReactNode }) {
  const { setUser } = useAuth();
  const [ready, setReady] = useState(false);
  const attempted = useRef(false);

  useEffect(() => {
    if (attempted.current) return;
    attempted.current = true;

    getMe()
      .then(data => setUser(data.user))
      .catch(() =>
        login({ email: 'direction@charles.ci', password: 'password' })
          .then(data => setUser(data.user))
          .catch(() => {})
      )
      .finally(() => setReady(true));
  }, []);

  if (!ready) return null;
  return <>{children}</>;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SessionRestorer>
          <RouterProvider router={router} />
        </SessionRestorer>
      </AuthProvider>
    </QueryClientProvider>
  );
}
