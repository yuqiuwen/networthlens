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
  /**
   * 下面这些「环比」字段后端类型是 `Decimal | None`，而接口默认
   * `response_model_exclude_none=True`：值为 None 时字段**整个从 JSON 里消失**
   * （既不是 null 也不是 0）。所以必须声明成可选，用 `?.` / `== null` 判断。
   */
  saving_rate?: number | null;
  previous_income: number;
  previous_expense: number;
  previous_balance: number;
  income_change?: number | null;
  expense_change?: number | null;
  balance_change?: number | null;
  /** 总资产较上一周期变化；上一周期边界日还没有快照时后端不返回该字段 */
  total_assets_change?: number | null;
  income_change_rate?: number | null;
  expense_change_rate?: number | null;
  /** 总资产环比；基期为 0 或缺少基期快照时为 None */
  total_assets_change_rate?: number | null;
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
  /**
   * 未归类的流水在后端是 NULL，而接口默认 `response_model_exclude_none=True`，
   * 所以这两个字段**会整个从 JSON 里消失**（既不是 null 也不是空串），
   * 这里必须声明为可选，取用时用 `?.` 兜底。
   */
  category_id?: string | null;
  category_name?: string | null;
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
  /** 未归类资产在后端是 NULL，字段会被 exclude_none 整个摘掉，所以声明为可选 */
  category_id?: string | null;
  category_name?: string | null;
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
