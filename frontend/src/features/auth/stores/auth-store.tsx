import { createContext, useContext, useState, type ReactNode } from 'react';

export type AuthUser = {
  id: number;
  name: string;
  email: string;
  role: { name: string; label: string };
  company: { id: number; name: string; slug?: string };
} | null;

type AuthContextType = {
  user: AuthUser;
  isAuthenticated: boolean;
  setUser: (user: AuthUser) => void;
  updateUser: (patch: Partial<NonNullable<AuthUser>>) => void;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  setUser: () => {},
  updateUser: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser>(null);

  function updateUser(patch: Partial<NonNullable<AuthUser>>) {
    setUser(prev => (prev ? { ...prev, ...patch } : prev));
  }

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: user !== null, setUser, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
