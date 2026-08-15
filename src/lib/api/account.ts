import { request } from "@/lib/api";
import { AccountStatus, AccountType } from "@/lib/constant";

export interface AccountListItem {
  id: string;
  account_type: AccountType;
  name: string;
  currency: string;
  status: AccountStatus;
  note?: string | null;
  icon?: string | null;
}

export interface AccountDetail {
  credit_limit?: number | null;
  note?: string | null;
  icon?: string | null;
}

export interface AccountBalance {
  id: string;
  currency: string;
  /** 单位：分 */
  balance: number;
  /** 信用卡可用余额，单位：分 */
  available_balance: number;
  credit_limit?: number | null;
}

export interface CreateAccountPayload {
  account_type: AccountType;
  name: string;
  currency?: string;
  /** 单位：分 */
  balance?: number;
  note?: string | null;
  icon?: string | null;
}

export interface UpdateAccountPayload {
  name?: string;
  balance?: number;
  status?: AccountStatus;
  note?: string | null;
  icon?: string | null;
}
// ---------------- Account APIs ----------------

export const accountApi = {
  list: () => request.get<AccountListItem[]>("/v1/account"),
  get: (id: string) => request.get<AccountDetail>(`/v1/account/${id}`),
  balances: (payload: { code: string; accountId?: string }) =>
    request.post<AccountBalance[]>("/v1/account/balance", {
      code: payload.code,
      ...(payload.accountId ? { account_id: payload.accountId } : {}),
    }),
  create: (payload: CreateAccountPayload) => request.post<string>("/v1/account", payload),
  update: (id: string, payload: UpdateAccountPayload) =>
    request.put<boolean>(`/v1/account/${id}`, payload),
  remove: (id: string) => request.delete<boolean>(`/v1/account/${id}`),
};
