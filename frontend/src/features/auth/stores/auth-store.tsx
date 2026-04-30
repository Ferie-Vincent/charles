import { createContext, useContext, useState, type ReactNode } from 'react';

export type AuthUser = {
  id: number;
  name: string;
  email: string;
  role: { name: string; label: string };
  company: { id: number; name: string };
} | null;

type AuthContextType = {
  user: AuthUser;
  isAuthenticated: boolean;
  setUser: (user: AuthUser) => void;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  setUser: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser>(null);
  return (
    <AuthContext.Provider value={{ user, isAuthenticated: user !== null, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
