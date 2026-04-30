export type AuthUser = {
  id: number;
  name: string;
  email: string;
  role: { name: string; label: string };
  company: { id: number; name: string };
} | null;

type AuthState = {
  user: AuthUser;
  isAuthenticated: boolean;
};

export const authState: AuthState = {
  user: null,
  isAuthenticated: false,
};

export function setAuthUser(user: AuthUser) {
  authState.user = user;
  authState.isAuthenticated = user !== null;
}

export function clearAuthUser() {
  authState.user = null;
  authState.isAuthenticated = false;
}
