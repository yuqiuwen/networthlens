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
  keywords?: string;
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
  product?: string | null;
  note?: string | null;
}

export interface ImportTransactionResult {
  success_count: number;
  failed_count: number;
  skipped_count?: number;
  import_source: ImportSource;
}

/** 冲减配对中的一侧流水。金额单位为分，符号沿用后端约定（支出为负）。 */
export interface OffsetTransactionSide {
  id: string;
  transaction_id: string;
  /** 后端 response_model_exclude_none，空值字段会整个消失 */
  merchant?: string | null;
  product?: string | null;
  amount: number;
  status: TransactionStatus;
  occurred_at: string;
}

export interface OffsetMatchItem {
  expense: OffsetTransactionSide;
  refund: OffsetTransactionSide;
  /** 命中依据，如 ["商户名互相包含"] */
  reasons: string[];
  interval_days: number;
}

export interface OffsetDetectResult {
  max_days: number;
  applied: boolean;
  /** 参与匹配的候选流水数 */
  candidate_count: number;
  /** 识别出的配对组数 */
  match_count: number;
  /** 实际被标记的流水笔数，dry-run 恒为 0 */
  updated_count: number;
  matches: OffsetMatchItem[];
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

  /**
   * 识别「支出 + 退款」冲减配对。
   * `apply: false` 只预览，`true` 才会把双方标记为冲减消费（transaction_type=8）。
   */
  detectOffset: (payload: { max_days: number; apply: boolean }) =>
    request.post<OffsetDetectResult>("/v1/transaction/offset/detect", payload),
};
