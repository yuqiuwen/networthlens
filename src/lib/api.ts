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

export const tokenStore = {
  get(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  },
  set(token: string, expireIn: number) {
    if (typeof window === "undefined") return;
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
    localStorage.setItem(ACCESS_TOKEN_EXPIRE_KEY, String(Date.now() + expireIn * 1000));
  },
  clear() {
    if (typeof window === "undefined") return;
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(ACCESS_TOKEN_EXPIRE_KEY);
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
      tokenStore.clear();
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

