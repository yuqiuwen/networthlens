import { request } from "@/lib/api";
import { AccountType } from "@/lib/constant";

export type DashboardPeriod = "month" | "quarter" | "year";

export interface DashboardQuery {
  period?: DashboardPeriod;
  query_date?: string;
  start_date?: string;
  end_date?: string;
}

export interface DashboardMetrics {
  available_funds: number;
  asset_value: number;
  total_assets: number;
  income: number;
  expense: number;
  balance: number;
  saving_rate: number | null;
  previous_income: number;
  previous_expense: number;
  previous_balance: number;
  income_change: number | null;
  expense_change: number | null;
  balance_change: number | null;
  total_assets_change: number | null;
  income_change_rate: number | null;
  expense_change_rate: number | null;
  total_assets_change_rate: number | null;
}

export interface CashFlowTrendItem {
  bucket_date: string;
  income: number;
  expense: number;
  balance: number;
}

export interface CashFlowTrend {
  items: CashFlowTrendItem[];
}

export interface ExpenseCategoryItem {
  category_id: string | null;
  category_name: string;
  amount: number;
  percentage: number;
  transaction_count: number;
  change: number | null;
  change_rate: number | null;
}

export interface ExpenseCategoryStatistics {
  total: number;
  items: ExpenseCategoryItem[];
}

export interface AccountDistributionItem {
  id: string;
  name: string;
  type: AccountType;
  balance: number;
  available_balance: number;
  percentage: number;
}

export interface AccountDistribution {
  total: number;
  items: AccountDistributionItem[];
}

export interface AssetCategoryItem {
  category_id: string;
  category_name: string;
  value: number;
  percentage: number;
  asset_count: number;
}

export interface AssetDistribution {
  total: number;
  items: AssetCategoryItem[];
}

export interface WealthTrendItem {
  bucket_date: string;
  account_value: number;
  asset_value: number;
  total_assets: number;
}

export interface WealthTrend {
  items: WealthTrendItem[];
}

function toParams(query: DashboardQuery = {}) {
  const params: Record<string, string> = {};
  if (query.period) params.period = query.period;
  if (query.query_date) params.query_date = query.query_date;
  if (query.start_date) params.start_date = query.start_date;
  if (query.end_date) params.end_date = query.end_date;
  return params;
}

export const statsApi = {
  metrics: (query: DashboardQuery = {}) =>
    request.get<DashboardMetrics>("/v1/stats/metrics", { params: toParams(query) }),
  expenseCategory: (query: DashboardQuery = {}) =>
    request.get<ExpenseCategoryStatistics>("/v1/stats/expense-category-stats", {
      params: toParams(query),
    }),
  cashFlow: (query: DashboardQuery = {}) =>
    request.get<CashFlowTrend>("/v1/stats/cash-flow", { params: toParams(query) }),
  accountStats: () => request.get<AccountDistribution>("/v1/stats/account-stats"),
  assetCategoryStats: (query: DashboardQuery = {}) =>
    request.get<AssetDistribution>("/v1/stats/asset-category-stats", { params: toParams(query) }),
  wealthTrend: (query: DashboardQuery = {}) =>
    request.get<WealthTrend>("/v1/stats/wealth-trend", { params: toParams(query) }),
};
