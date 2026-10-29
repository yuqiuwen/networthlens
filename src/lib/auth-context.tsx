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

  // 订阅 tokenStore，让 token 状态跟着存储走。
  //
  // 以前没有这个订阅，而刷新失败是 `api.ts` 内部调的 `tokenStore.clear()` ——
  // AuthProvider 根本收不到通知，于是出现「localStorage 已登出、isAuthenticated
  // 还是 true」的分叉，路由守卫也因此认为用户仍然登录着。
  //
  // 这里刻意**不用** useSyncExternalStore：它在水合期的首次客户端渲染会调用
  // getServerSnapshot，而本项目是 TanStack Start（有 SSR），服务端没有 localStorage
  // 只能返回 null —— 于是首帧的 token 是 null，会误触发一次「跳登录页」。
  // useState 的初始值在客户端直接取本地值，不存在这个中间态。
  React.useEffect(() => {
    // 订阅之前可能已经变过（首屏的请求失败会立刻 clear），先对齐一次再订阅。
    setToken(tokenStore.get());
    return tokenStore.subscribe(() => setToken(tokenStore.get()));
  }, []);

  const setSession = React.useCallback((result: AuthResult) => {
    // 只写存储；React 状态由上面的订阅同步，不需要再 setState。
    tokenStore.set(result.access_token, result.expire_in);
  }, []);

  const logout = React.useCallback(() => {
    // 不传 reason：主动退出不需要弹「登录已失效」的提示。
    tokenStore.clear();
    queryClient.removeQueries({ queryKey: ["user", "profile"] });
  }, [queryClient]);

  // 挂载时如果本地没有 access token，就用 httpOnly 的 refresh cookie 静默换一个。
  // 成功的话 refreshToken() 内部会写 tokenStore，订阅会把状态同步过来。
  React.useEffect(() => {
    if (token) return;
    authApi.refresh().catch(() => {
      /* 没有 refresh cookie（cookie 过期 / 换了浏览器 / 隐身窗口）就是未登录，属正常情况 */
    });
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
