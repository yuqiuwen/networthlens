import { request } from "@/lib/api";
import { TransactionChannel, TransactionStatus, TransactionType } from "@/lib/constant";

export type ImportSource = "wx" | "alipay";

export interface TransactionListItem {
  id: string;
  channel: TransactionChannel | null;
  transaction_type: TransactionType;
  category_id: string | null;
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
  category_id?: string;
  source_account_id?: string;
  target_account_id?: string;
  start_time?: string;
  end_time?: string;
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

export interface ImportTransactionResult {
  success_count: number;
  failed_count: number;
  skipped_count?: number;
  import_source: ImportSource;
}

export const transactionApi = {
  list: (query: TransactionQuery) =>
    request.get<PageResp<TransactionListItem>>("/v1/transaction", { params: query }),
  summary: (query: Partial<TransactionQuery> ={}) =>
    request.get<TransactionSummary>("/v1/transaction/summary", { params: query }),
  create: (payload: CreateTransactionPayload) => request.post<string>("/v1/transaction", payload),
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
