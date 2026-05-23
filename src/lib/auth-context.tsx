import * as React from "react";
import { authApi, tokenStore, type AuthResult } from "./api";

interface AuthContextValue {
  isAuthenticated: boolean;
  token: string | null;
  setSession: (result: AuthResult) => void;
  logout: () => void;
}

const AuthContext = React.createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = React.useState<string | null>(() => tokenStore.get());

  const setSession = React.useCallback((result: AuthResult) => {
    tokenStore.set(result.access_token, result.expire_in);
    setToken(result.access_token);
  }, []);

  const logout = React.useCallback(() => {
    tokenStore.clear();
    setToken(null);
  }, []);

  // Attempt silent refresh on mount if no token (uses httpOnly refresh cookie).
  React.useEffect(() => {
    if (token) return;
    let cancelled = false;
    authApi
      .refresh()
      .then((access) => {
        if (!cancelled) setToken(access);
      })
      .catch(() => {
        /* not logged in — fine */
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = React.useMemo<AuthContextValue>(
    () => ({
      isAuthenticated: !!token,
      token,
      setSession,
      logout,
    }),
    [token, setSession, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
