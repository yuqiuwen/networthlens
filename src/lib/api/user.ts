import { queryOptions } from "@tanstack/react-query";
import { request } from "@/lib/api";

/**
 * `GET /v1/me` 的返回体。
 *
 * 注意：接口默认 `response_model_exclude_none=True`，后端为 `None` 的字段
 * **会整个从 JSON 里消失**（既不是 null 也不是空串）。所以除 `id` / `username` /
 * `ctime` 这几个非空列之外，其余字段一律声明为可选，取用时用 `?.` / `??` 兜底，
 * 否则会漏掉「字段根本不存在」这种真实情况。
 */
export interface UserProfile {
  id: number;
  username: string;
  ctime: number;
  account?: string | null;
  /** 头像地址；为空（字段缺失 / null / 空串）时前端回退为首字母头像 */
  avatar?: string | null;
  birth?: string | null;
  gender?: 0 | 1 | null;
  phone?: string | null;
  email?: string | null;
  title?: string | null;
  introduce?: string | null;
  utime?: number | null;
  base_currency?: string | null;
}

/** `PUT /v1/me` 的请求体：只提交要改的字段，未提交的字段保持不变。 */
export interface UpdateProfilePayload {
  username?: string;
  title?: string | null;
  introduce?: string | null;
  gender?: 0 | 1 | null;
  /** 格式 YYYY-MM-DD */
  birth?: string | null;
  avatar?: string | null;
}

export const userApi = {
  getProfile: () => request.get<UserProfile>("/v1/me"),
  updateProfile: (payload: UpdateProfilePayload) => request.put<UserProfile>("/v1/me", payload),
};

export const userProfileQueryOptions = queryOptions({
  queryKey: ["user", "profile"],
  queryFn: () => userApi.getProfile(),
  staleTime: 5 * 60_000,
});
