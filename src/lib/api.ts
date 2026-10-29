// Unified API client for FastAPI backend, built on top of ky.
// All responses come back with HTTP 200 and a unified envelope:
// { code: number, msg: string, data?: any, errmsg?: string }

import ky, { HTTPError, type KyInstance, type Options as KyOptions } from "ky";

// 开发环境强制走同源 /v1 代理（见 vite.config.ts），避免浏览器直连后端触发 CORS。
// 生产环境才读取 VITE_API_BASE_URL 作为后端地址。
const configuredApiBaseUrl =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() ?? "";

export const API_BASE_URL = import.meta.env.DEV ? "" : configuredApiBaseUrl;

function toRequestUrl(path: string) {
  const normalized = path.startsWith("/") ? path.slice(1) : path;
  return API_BASE_URL ? normalized : `/${normalized}`;
}

const ACCESS_TOKEN_KEY = "nwl_access_token";
const ACCESS_TOKEN_EXPIRE_KEY = "nwl_access_token_expire";

type TokenListener = () => void;
const tokenListeners = new Set<TokenListener>();

/**
 * 最近一次「被动失效」的原因，用来告诉用户他为什么被弹回了登录页。
 * 主动退出（`logout`）不传 reason，所以不会弹提示 —— 自己点的退出不需要解释。
 */
let clearedReason: string | null = null;

function emitTokenChange() {
  for (const listener of tokenListeners) listener();
}

/**
 * 登录态存储。
 *
 * 之所以做成「可订阅」，是因为它以前是**哑**的：`unwrap()` 在刷新失败时会
 * `tokenStore.clear()` 清掉 localStorage，但 `AuthProvider` 里的 `token` state
 * 并不知道这件事，`isAuthenticated` 仍然是 `true`。而 `_authenticated.tsx` 的
 * 路由守卫走的是 `beforeLoad` —— 它**只在导航时执行一次**，页面已经渲染出来之后
 * 不会再跑。两个原因叠加，用户就会停在原页面看一张「加载失败：认证失败」的
 * 错误卡片：localStorage 里已经登出了，内存里还以为自己登着，既不跳转也不恢复。
 *
 * 改成订阅制后，任何一处 `set` / `clear`（`unwrap`、`chat.ts` 的流式分支、
 * `AuthProvider` 自己）都会同步到 React 状态，两边不会再分叉。
 *
 * 注意：`get()` 只看「有没有」，不校验 `nwl_access_token_expire`。过期的 token
 * 依然算「有」，靠 `unwrap` 拿到 `code=40001` 后再去刷新 —— 这是刻意的，
 * 前端不做时间判断，避免客户端时钟不准造成误判。
 */
export const tokenStore = {
  get(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  },
  set(token: string, expireIn: number) {
    if (typeof window === "undefined") return;
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
    localStorage.setItem(ACCESS_TOKEN_EXPIRE_KEY, String(Date.now() + expireIn * 1000));
    // 换到新 token 说明上一轮失效已被恢复，把待提示的原因一起丢掉。
    clearedReason = null;
    emitTokenChange();
  },
  /**
   * 清空登录态。
   * @param reason 传入表示「被动失效」（刷新失败、流式接口 401 等），会被 UI 取走并
   *               提示用户；不传表示用户主动退出，静默处理。
   */
  clear(reason?: string) {
    if (typeof window === "undefined") return;
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(ACCESS_TOKEN_EXPIRE_KEY);
    clearedReason = reason ?? null;
    emitTokenChange();
  },
  subscribe(listener: TokenListener): () => void {
    tokenListeners.add(listener);
    return () => {
      tokenListeners.delete(listener);
    };
  },
  /** 取走并清空「被动失效」原因。只在准备提示用户时调用一次，避免重复弹窗。 */
  consumeClearedReason(): string | null {
    const reason = clearedReason;
    clearedReason = null;
    return reason;
  },
};

export interface ApiEnvelope<T = unknown> {
  code: number;
  msg: string;
  data?: T;
  errmsg?: string;
}

export class ApiError extends Error {
  code: number;
  constructor(code: number, message: string) {
    super(message);
    this.code = code;
  }
}

let refreshPromise: Promise<string> | null = null;

function refreshToken(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const json = await ky
        .post(toRequestUrl("/v1/auth/refresh"), {
          ...(API_BASE_URL ? { prefixUrl: API_BASE_URL } : {}),
          credentials: "include",
        })
        .json<ApiEnvelope<{ access_token: string; expire_in: number }>>();
      if (json.code !== 0 || !json.data) {
        throw new ApiError(json.code, json.errmsg || "刷新登录态失败");
      }
      tokenStore.set(json.data.access_token, json.data.expire_in);
      return json.data.access_token;
    })().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

// 内部 ky 实例：自动注入 Authorization 头。
const kyClient: KyInstance = ky.create({
  ...(API_BASE_URL ? { prefixUrl: API_BASE_URL } : {}),
  credentials: "include",
  timeout: 20_000,
  hooks: {
    beforeRequest: [
      ({ request }) => {
        const token = tokenStore.get();
        if (token && !request.headers.has("Authorization")) {
          request.headers.set("Authorization", `Bearer ${token}`);
        }
      },
    ],
  },
});

/** 业务请求封装：统一解包 envelope，自动刷新 token。 */
export interface RequestOptions extends KyOptions {
  /** 不携带 Authorization 头 */
  skipAuth?: boolean;
  /** 内部使用：标记是否已经重试过 */
  _retry?: boolean;
  params?: Record<string, any>;
}

async function unwrap<T>(
  method: "get" | "post" | "put" | "delete" | "patch",
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { skipAuth, _retry, headers, params, ...rest } = options;
  const url = toRequestUrl(path);

  const finalHeaders = new Headers(headers as HeadersInit | undefined);

  let envelope: ApiEnvelope<T>;
  try {
    envelope = await kyClient(url, {
      ...rest,
      method,
      searchParams: params, // 映射到 ky
      headers: skipAuth ? finalHeaders : finalHeaders, // header 注入由 ky hook 完成
      retry: 0,
      hooks: {
        beforeRequest: [
          ({ request }) => {
            if (skipAuth) request.headers.delete("Authorization");
          },
        ],
      },
    }).json<ApiEnvelope<T>>();
  } catch (err) {
    if (err instanceof HTTPError) {
      throw new ApiError(err.response.status, `网络错误 (${err.response.status})`);
    }
    throw new ApiError(-1, (err as Error)?.message || "网络错误");
  }

  if (envelope.code === 40001 && !_retry && !skipAuth) {
    try {
      await refreshToken();
      return unwrap<T>(method, path, { ...options, _retry: true });
    } catch {
      // 带上 reason：登录态是被动失效的，用户没主动退出，所以要如实说明原因，
      // 否则他只会看到一张「加载失败：认证失败」的卡片，不知道发生了什么。
      tokenStore.clear(envelope.errmsg || "登录状态已失效，请重新登录");
      throw new ApiError(40001, envelope.errmsg || "未认证，请重新登录");
    }
  }

  if (envelope.code !== 0) {
    throw new ApiError(envelope.code, envelope.errmsg || envelope.msg || "请求失败");
  }

  return envelope.data as T;
}

export const request = {
  get: <T = unknown>(path: string, options?: RequestOptions) => unwrap<T>("get", path, options),
  post: <T = unknown>(path: string, body?: unknown, options?: RequestOptions) =>
    unwrap<T>("post", path, { ...options, json: body }),
  postForm: <T = unknown>(path: string, formData: FormData, options?: RequestOptions) =>
    unwrap<T>("post", path, { ...options, body: formData }),
  put: <T = unknown>(path: string, body?: unknown, options?: RequestOptions) =>
    unwrap<T>("put", path, { ...options, json: body }),
  patch: <T = unknown>(path: string, body?: unknown, options?: RequestOptions) =>
    unwrap<T>("patch", path, { ...options, json: body }),
  delete: <T = unknown>(path: string, options?: RequestOptions) =>
    unwrap<T>("delete", path, options),
};

// 向后兼容的旧名字（其它代码可能仍在引用）
export const apiRequest = async <T = unknown>(
  path: string,
  options: RequestOptions & { method?: string; body?: unknown } = {},
): Promise<T> => {
  const { method = "GET", body, ...rest } = options;
  const m = method.toLowerCase() as "get" | "post" | "put" | "patch" | "delete";
  if (m === "get" || m === "delete") return unwrap<T>(m, path, rest);
  return unwrap<T>(m, path, { ...rest, json: body });
};

// ---------------- Secret APIs ----------------

export interface RSAPublicKeyResp {
  public_key: string;
}

export const getRSAPublicKeyApi = (biz: "user_pwd") =>
  request.post<RSAPublicKeyResp>("/v1/secret/rsa_public_key", { biz }, { skipAuth: true });

// ---------------- Auth APIs ----------------

export type CodeType = "pwd" | "code";

export interface LoginPayload {
  account: string;
  code: string;
  code_type: CodeType;
  auth_type?: number | null;
}

export interface SignupPayload {
  account: string;
  auth_type: 1 | 2 | 3 | 4;
  pwd?: string;
  code?: string;
  username?: string;
}

export interface AuthResult {
  access_token: string;
  expire_in: number;
}

export const authApi = {
  login: async (payload: LoginPayload) => {
    const { encryptWithBiz } = await import("./crypto");
    const body =
      payload.code_type === "pwd"
        ? { ...payload, code: await encryptWithBiz(payload.code, "user_pwd") }
        : payload;
    return request.post<AuthResult>("/v1/auth/login", body, { skipAuth: true });
  },
  signup: async (payload: SignupPayload) => {
    const { encryptWithBiz } = await import("./crypto");
    const encryptedPwd = payload.pwd ? await encryptWithBiz(payload.pwd, "user_pwd") : undefined;
    return request.post<AuthResult>(
      "/v1/auth/signup",
      {
        ...payload,
        ...(encryptedPwd ? { pwd: encryptedPwd } : {}),
        is_encrypted: !!encryptedPwd,
      },
      { skipAuth: true },
    );
  },
  refresh: () => refreshToken(),
  logout: () => request.post<unknown>("/v1/auth/logout").catch(() => undefined),
};

