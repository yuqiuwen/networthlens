import { request } from "@/lib/api";
import type { GoalStatus, GoalType } from "@/lib/constant";

// 金额单位约定：本模块接口层统一使用「分」（整数），与 account / asset /
// transaction 一致。展示时除以 100，提交时 Math.round(元 * 100)。

export interface GoalItem {
  id: string;
  goal_type: GoalType;
  name: string;
  /** 单位：分 */
  target_amount: number;
  /** 单位：分（冗余缓存，真值 = 追加记录之和） */
  current_amount: number;
  start_date?: string | null;
  deadline?: string | null;
  /** 数值越小越优先 */
  priority: number;
  status: GoalStatus;
  completed_at?: string | null;
  note?: string | null;

  // ---- 派生字段（后端实时计算，不落库） ----
  /** 进度比例，0~1；超额时 > 1 */
  progress: number;
  /** 剩余金额（分） */
  remaining_amount: number;
  /** 距截止天数，当天为 0；无截止日时缺省 */
  remaining_days?: number | null;
  is_overdue: boolean;
  is_exceeded: boolean;
  /** 月度建议储蓄（分），无截止日或已逾期时缺省 */
  monthly_suggested_saving?: number | null;
  /** 预计达成所需月数，无法预测时缺省 */
  estimated_months?: number | null;
  estimated_date?: string | null;
}

export interface GoalSummary {
  total_count: number;
  in_progress_count: number;
  completed_count: number;
  paused_count: number;
  archived_count: number;
  /** 单位：分 */
  total_target_amount: number;
  /** 单位：分 */
  total_current_amount: number;
  overall_progress: number;
}

export interface ContributionItem {
  id: string;
  goal_id: string;
  account_id?: string | null;
  transaction_id?: string | null;
  /** 单位：分，正数=存入 / 负数=取出 */
  amount: number;
  contributed_at: string;
  note?: string | null;
}

export interface ContributionPage {
  last: string | null;
  has_more: boolean;
  items: ContributionItem[];
}

export interface ContributionResult {
  contribution_id?: string | null;
  /** 单位：分 */
  current_amount: number;
  target_amount?: number | null;
  reached_target?: boolean | null;
}

export interface GoalForecast {
  goal_id: string;
  /** 单位：分 */
  target_amount: number;
  /** 单位：分 */
  current_amount: number;
  /** 单位：分 */
  remaining_amount: number;
  estimated_months?: number | null;
  estimated_date?: string | null;
  /** 近 12 个月月均净结余（分），<= 0 时缺省 */
  avg_monthly_saving?: number | null;
  /** 按截止日反推的月度建议储蓄（分） */
  monthly_suggested_saving?: number | null;
}

export interface GoalListQuery {
  status?: GoalStatus;
  goal_type?: GoalType;
  overdue?: boolean;
  keyword?: string;
}

export interface CreateGoalPayload {
  name: string;
  goal_type: GoalType;
  /** 单位：分 */
  target_amount: number;
  start_date?: string | null;
  deadline?: string | null;
  priority?: number;
  note?: string | null;
  /** 单位：分，> 0 时会同时生成一条追加记录 */
  initial_amount?: number;
}

export interface UpdateGoalPayload {
  name?: string;
  goal_type?: GoalType;
  /** 单位：分 */
  target_amount?: number;
  start_date?: string | null;
  deadline?: string | null;
  priority?: number;
  note?: string | null;
}

export interface CreateContributionPayload {
  /** 单位：分，正数=存入 / 负数=取出 */
  amount: number;
  contributed_at?: string | null;
  account_id?: string | null;
  note?: string | null;
}

// ---------------- Goal APIs ----------------

export const goalApi = {
  list: (params?: GoalListQuery) => request.get<GoalItem[]>("/v1/goal", { params }),
  summary: () => request.get<GoalSummary>("/v1/goal/summary"),
  get: (id: string) => request.get<GoalItem>(`/v1/goal/${id}`),
  create: (payload: CreateGoalPayload) => request.post<string>("/v1/goal", payload),
  update: (id: string, payload: UpdateGoalPayload) =>
    request.put<boolean>(`/v1/goal/${id}`, payload),
  remove: (id: string) => request.delete<boolean>(`/v1/goal/${id}`),
  changeStatus: (id: string, status: GoalStatus) =>
    request.post<boolean>(`/v1/goal/${id}/status`, { status }),

  contributions: (id: string, params?: { last?: string; limit?: number }) =>
    request.get<ContributionPage>(`/v1/goal/${id}/contributions`, { params }),
  addContribution: (id: string, payload: CreateContributionPayload) =>
    request.post<ContributionResult>(`/v1/goal/${id}/contributions`, payload),
  removeContribution: (id: string, contributionId: string) =>
    request.delete<ContributionResult>(`/v1/goal/${id}/contributions/${contributionId}`),

  forecast: (id: string) => request.get<GoalForecast>(`/v1/goal/${id}/forecast`),
};
