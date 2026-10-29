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
  /**
   * 余额上次实测时间。后端声明为 `datetime | None`，而接口默认
   * `response_model_exclude_none=True`：值为 None 时字段**整个从 JSON 里消失**。
   * 存量账户（以及所有还没同步过余额的账户）就是这个情况，所以必须声明成可选，
   * 用 `== null` 判断「从未实测」，不能当空串处理。
   */
  balance_updated_at?: string | null;
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
  /**
   * 账户类型。曾经只有创建接口能指定（`UpdateAccountSchema` 里没有这个字段，
   * 传了会被 pydantic 静默丢弃），现在后端已放开，非法值返回 `无效的账户类型`。
   * 显式传 `null` 视为「不修改」。
   */
  account_type?: AccountType;
  balance?: number;
  status?: AccountStatus;
  note?: string | null;
  icon?: string | null;
}

/** 同步余额的结果。金额单位：分。 */
export interface AccountBalanceSyncResult {
  account_id: string;
  /** 本次录入的余额 */
  balance: number;
  /** 上次记录的余额 */
  previous_balance: number;
  /** 上次实测时间；从未实测过时为 undefined（后端 exclude_none 会把字段摘掉） */
  previous_measured_at?: string | null;
  /** 上次实测到现在，该账户已记录流水的净额 */
  recorded_flow?: number | null;
  /**
   * 未记录缺口 = balance − (previous_balance + recorded_flow)。
   * 正数表示流水少记了，负数表示多记了。没有上次实测时间时算不出来。
   */
  drift?: number | null;
  /** drift 是否可用。没有上次实测时间时为 false，本次只作为基准。 */
  drift_available: boolean;
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
  /**
   * 录入实际余额并拿回本次对账缺口。
   * 银行/微信/支付宝都没有余额查询接口，账单导出里也没有余额列，
   * 所以这个值只能由人从三方 App 上看到后录进来。
   * `code` 必须是 RSA 加密后的查看密钥（同 `secretApi.verify` 的返回值）。
   */
  syncBalance: (id: string, payload: { code: string; balance: number }) =>
    request.post<AccountBalanceSyncResult>(`/v1/account/${id}/sync-balance`, payload),
};
