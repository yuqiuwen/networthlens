import { AccountStatus, AccountType,  } from "@/lib/constant";
import {request} from "@/lib/api"

export interface AccountListItem {
    id: string;
    account_type: AccountType;
    name: string;
    currency: string;
    /** 单位：分 */
    balance: number;
    status: AccountStatus;
  }
  
  export interface AccountDetail {
    available_balance: number;
    credit_limit?: number | null;
    note?: string | null;
  }
  
  export interface CreateAccountPayload {
    account_type: AccountType;
    name: string;
    currency?: string;
    /** 单位：分 */
    balance?: number;
  }
  
  export interface UpdateAccountPayload {
    name?: string;
    balance?: number;
    status?: AccountStatus;
  }
// ---------------- Account APIs ----------------

export const accountApi = {
  list: () => request.get<AccountListItem[]>("/v1/account"),
  get: (id: string) => request.get<AccountDetail>(`/v1/account/${id}`),
  create: (payload: CreateAccountPayload) => request.post<string>("/v1/account", payload),
  update: (id: string, payload: UpdateAccountPayload) =>
    request.put<boolean>(`/v1/account/${id}`, payload),
  remove: (id: string) => request.delete<boolean>(`/v1/account/${id}`),
};
