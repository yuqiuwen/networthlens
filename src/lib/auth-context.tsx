import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { authApi, tokenStore, type AuthResult } from "./api";
import { userProfileQueryOptions, type UserProfile } from "./api/user";

interface AuthContextValue {
  isAuthenticated: boolean;
  token: string | null;
  profile: UserProfile | null;
  isProfileLoading: boolean;
  setSession: (result: AuthResult) => void;
  logout: () => void;
  refreshProfile: () => Promise<unknown>;
}

const AuthContext = React.createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = React.useState<string | null>(() => tokenStore.get());
  const queryClient = useQueryClient();

  const setSession = React.useCallback((result: AuthResult) => {
    tokenStore.set(result.access_token, result.expire_in);
    setToken(result.access_token);
  }, []);

  const logout = React.useCallback(() => {
    tokenStore.clear();
    setToken(null);
    queryClient.removeQueries({ queryKey: ["user", "profile"] });
  }, [queryClient]);

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

  // Whenever we have a token (initial mount or page refresh), fetch /v1/me.
  const profileQuery = useQuery({
    ...userProfileQueryOptions,
    enabled: !!token,
  });

  const value = React.useMemo<AuthContextValue>(
    () => ({
      isAuthenticated: !!token,
      token,
      profile: profileQuery.data ?? null,
      isProfileLoading: profileQuery.isLoading,
      setSession,
      logout,
      refreshProfile: () =>
        queryClient.invalidateQueries({ queryKey: ["user", "profile"] }),
    }),
    [token, profileQuery.data, profileQuery.isLoading, setSession, logout, queryClient],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
