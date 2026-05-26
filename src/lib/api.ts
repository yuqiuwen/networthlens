// Unified API client for FastAPI backend.
// All responses come back with HTTP 200 and a unified envelope:
// { code: number, msg: string, data?: any, errmsg?: string }

export const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "http://127.0.0.1:5555";

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
    localStorage.setItem(
      ACCESS_TOKEN_EXPIRE_KEY,
      String(Date.now() + expireIn * 1000),
    );
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

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  skipAuth?: boolean;
  _retry?: boolean;
}

let refreshPromise: Promise<string> | null = null;

async function refreshToken(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const res = await fetch(`${API_BASE_URL}/v1/auth/refresh`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      const json = (await res.json()) as ApiEnvelope<{
        access_token: string;
        expire_in: number;
      }>;
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

export async function apiRequest<T = unknown>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { body, skipAuth, _retry, headers, ...rest } = options;

  const finalHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...(headers as Record<string, string> | undefined),
  };

  if (!skipAuth) {
    const token = tokenStore.get();
    if (token) finalHeaders["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: finalHeaders,
    credentials: "include",
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  let json: ApiEnvelope<T>;
  try {
    json = (await res.json()) as ApiEnvelope<T>;
  } catch {
    throw new ApiError(-1, `网络错误 (${res.status})`);
  }

  if (json.code === 40001 && !_retry && !skipAuth) {
    try {
      await refreshToken();
      return apiRequest<T>(path, { ...options, _retry: true });
    } catch {
      tokenStore.clear();
      throw new ApiError(40001, json.errmsg || "未认证，请重新登录");
    }
  }

  if (json.code !== 0) {
    throw new ApiError(json.code, json.errmsg || json.msg || "请求失败");
  }

  return json.data as T;
}

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
    const { rsaEncrypt } = await import("./crypto");
    // 密码登录时对 code 字段（即密码）做 RSA 加密；验证码登录不加密。
    const body =
      payload.code_type === "pwd"
        ? { ...payload, code: await rsaEncrypt(payload.code) }
        : payload;
    return apiRequest<AuthResult>("/v1/auth/login", {
      method: "POST",
      body,
      skipAuth: true,
    });
  },
  signup: async (payload: SignupPayload) => {
    const { rsaEncrypt } = await import("./crypto");
    const encryptedPwd = payload.pwd ? await rsaEncrypt(payload.pwd) : undefined;
    return apiRequest<AuthResult>("/v1/auth/signup", {
      method: "POST",
      body: {
        ...payload,
        ...(encryptedPwd ? { pwd: encryptedPwd } : {}),
        is_encrypted: !!encryptedPwd,
      },
      skipAuth: true,
    });
  },
  refresh: () => refreshToken(),
};
