import { request } from "@/lib/api";
import { TransactionChannel, TransactionStatus, TransactionType } from "@/lib/constant";

export type ImportSource = "wx" | "alipay";

export interface TransactionCategory {
  id: string;
  category_type: number;
  name: string;
  code?: string | null;
  icon?: string | null;
  color?: string | null;
  sort_no?: number;
}

export interface TransactionListItem {
  id: string;
  channel: TransactionChannel | null;
  transaction_type: TransactionType;
  category_id: string | null;
  category?: TransactionCategory | null;
  source_account_id: string | null;
  target_account_id: string | null;
  /** Amount in the smallest currency unit, usually cents. */
  amount: number;
  currency: string;
  merchant: string | null;
  product: string | null;
  note: string | null;
  occurred_at: string;
  status: TransactionStatus;
}

export interface TransactionSummary {
  income: number;
  expense: number;
  balance: number;
}

export interface PageResp<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export interface TransactionQuery {
  page?: number;
  limit?: number;
  transaction_type?: TransactionType;
  /** 支持多选，多个 id 以逗号分隔提交 */
  category_id?: string | string[];
  source_account_id?: string | string[];
  target_account_id?: string | string[];
  start_time?: string;
  end_time?: string;
}

/** 数组参数转为逗号分隔字符串，空值移除 */
export function normalizeTransactionQuery<T extends Partial<TransactionQuery>>(
  query: T,
): Record<string, string | number> {
  const params: Record<string, string | number> = {};
  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    if (Array.isArray(value)) {
      if (value.length === 0) return;
      params[key] = value.join(",");
    } else {
      params[key] = value as string | number;
    }
  });
  return params;
}


export interface CreateTransactionPayload {
  channel: TransactionChannel;
  transaction_type: TransactionType;
  category_id?: string | null;
  source_account_id?: string | null;
  target_account_id?: string | null;
  amount: number;
  currency?: string;
  merchant?: string | null;
  product?: string | null;
  occurred_at: string;
  note?: string | null;
}

export interface UpdateTransactionPayload {
  transaction_type?: TransactionType;
  category_id?: string | null;
  source_account_id?: string | null;
  target_account_id?: string | null;
  note?: string | null;
}

export interface ImportTransactionResult {
  success_count: number;
  failed_count: number;
  skipped_count?: number;
  import_source: ImportSource;
}

export const transactionApi = {
  list: (query: TransactionQuery) =>
    request.get<PageResp<TransactionListItem>>("/v1/transaction", {
      params: normalizeTransactionQuery(query),
    }),
  summary: (query: Partial<TransactionQuery> = {}) =>
    request.get<TransactionSummary>("/v1/transaction/summary", {
      params: normalizeTransactionQuery(query),
    }),

  create: (payload: CreateTransactionPayload) => request.post<string>("/v1/transaction", payload),
  update: (id: string, payload: UpdateTransactionPayload) =>
    request.put<boolean>(`/v1/transaction/${id}`, payload),
  import: ({
    source,
    file,
    accountId,
  }: {
    source: ImportSource;
    file: File;
    accountId?: string;
  }) => {
    const formData = new FormData();
    formData.append("file", file);
    return request.postForm<ImportTransactionResult>("/v1/transaction/import", formData, {
      params: {
        import_source: source,
        ...(accountId ? { account_id: accountId } : {}),
      },
    });
  },
};
