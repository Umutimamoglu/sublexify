import React, { createContext, useContext } from 'react';
import { useAuthStore, type User } from '@/src/store/authStore';

type AuthContextValue = {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user, token, isAuthenticated, setAuth, clearAuth } = useAuthStore();

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated,
        login: setAuth,
        logout: clearAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
