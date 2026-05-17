import { useEffect, useRef, useState, type ReactNode } from 'react';
import { RouterProvider } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import axios from 'axios';
import { router } from './router';
import { queryClient } from './lib/query-client';
import { AuthProvider, useAuth } from './features/auth/stores/auth-store';
import { PermissionsProvider } from './lib/permissions-context';
import { getMe } from './features/auth/api/login';

function AppSplash() {
  return (
    <div className="app-splash">
      <div className="app-splash__spinner" />
    </div>
  );
}

function SessionRestorer({ children }: { children: ReactNode }) {
  const { setUser } = useAuth();
  const [ready, setReady] = useState(false);
  const attempted = useRef(false);

  useEffect(() => {
    if (attempted.current) return;
    attempted.current = true;

    axios
      .get('http://localhost:8000/sanctum/csrf-cookie', { withCredentials: true })
      .then(() => getMe())
      .then(data => setUser(data.user))
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  if (!ready) return <AppSplash />;
  return <>{children}</>;
}

function GlobalErrorToast() {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      setMessage((e as CustomEvent<string>).detail);
      setTimeout(() => setMessage(null), 5000);
    };
    window.addEventListener('api-error', handler);
    return () => window.removeEventListener('api-error', handler);
  }, []);

  if (!message) return null;
  return (
    <div style={{
      position: 'fixed', bottom: '1.5rem', left: '50%', transform: 'translateX(-50%)',
      background: '#ef4444', color: '#fff', padding: '0.75rem 1.25rem',
      borderRadius: '8px', zIndex: 9999, maxWidth: '480px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.2)', fontSize: '0.9rem',
    }}>
      {message}
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SessionRestorer>
          <PermissionsProvider>
            <RouterProvider router={router} />
            <GlobalErrorToast />
          </PermissionsProvider>
        </SessionRestorer>
      </AuthProvider>
    </QueryClientProvider>
  );
}
