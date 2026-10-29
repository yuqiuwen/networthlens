import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  Archive,
  CalendarClock,
  CheckCircle2,
  Loader2,
  MoreHorizontal,
  Pause,
  Pencil,
  Play,
  Trash2,
  TrendingUp,
  Wallet,
  X,
} from "lucide-react";

import { ApiError } from "@/lib/api";
import {
  goalApi,
  type ContributionResult,
  type CreateContributionPayload,
  type GoalForecast,
  type GoalItem,
} from "@/lib/api/goal";
import { GoalStatus, GoalStatusMap, GoalTypeMap } from "@/lib/constant";
import { formatCents } from "@/lib/money";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { GoalFormSheet } from "@/components/goal-form-sheet";
import { GoalContributeSheet } from "@/components/goal-contribute-sheet";

export const Route = createFileRoute("/_authenticated/goals_/$goalId")({
  head: () => ({ meta: [{ title: "目标详情 · Finora" }] }),
  component: GoalDetailPage,
});

const TRANSITIONS: Record<GoalStatus, GoalStatus[]> = {
  [GoalStatus.IN_PROGRESS]: [GoalStatus.PAUSED, GoalStatus.COMPLETED, GoalStatus.ARCHIVED],
  [GoalStatus.PAUSED]: [GoalStatus.IN_PROGRESS, GoalStatus.COMPLETED, GoalStatus.ARCHIVED],
  [GoalStatus.COMPLETED]: [GoalStatus.IN_PROGRESS, GoalStatus.ARCHIVED],
  [GoalStatus.ARCHIVED]: [GoalStatus.IN_PROGRESS],
};

const formatDateTime = (value: string) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
};

/** 预计达成 vs 计划达成的对比结论（需求文档 §7.3）。 */
function compareForecast(estimatedDate?: string | null, deadline?: string | null) {
  if (!estimatedDate || !deadline) return null;
  const est = new Date(`${estimatedDate}T00:00:00`).getTime();
  const plan = new Date(`${deadline}T00:00:00`).getTime();
  if (Number.isNaN(est) || Number.isNaN(plan)) return null;

  const diffDays = Math.round((plan - est) / 86_400_000);
  const months = Math.round(Math.abs(diffDays) / 30);

  if (months < 1) return { tone: "neutral" as const, text: "与计划基本一致" };
  if (diffDays > 0) {
    return { tone: "good" as const, text: `比计划快约 ${months} 个月` };
  }
  return { tone: "warn" as const, text: `比计划慢约 ${months} 个月` };
}

function GoalDetailPage() {
  const { goalId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [formOpen, setFormOpen] = useState(false);
  const [contributeOpen, setContributeOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const goalQuery = useQuery({
    queryKey: ["goal", goalId],
    queryFn: () => goalApi.get(goalId),
  });

  const forecastQuery = useQuery({
    queryKey: ["goal", goalId, "forecast"],
    queryFn: () => goalApi.forecast(goalId),
  });

  const contributionsQuery = useQuery({
    queryKey: ["goal", goalId, "contributions"],
    queryFn: () => goalApi.contributions(goalId, { limit: 50 }),
  });

  const goal: GoalItem | undefined = goalQuery.data;
  const forecast: GoalForecast | undefined = forecastQuery.data;
  const contributions = contributionsQuery.data?.items ?? [];

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["goal", goalId] });
    queryClient.invalidateQueries({ queryKey: ["goals"] });
  };

  const updateMut = useMutation({
    mutationFn: (payload: Parameters<typeof goalApi.update>[1]) => goalApi.update(goalId, payload),
    onSuccess: () => {
      toast.success("已保存");
      setFormOpen(false);
      invalidate();
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "保存失败"),
  });

  const statusMut = useMutation({
    mutationFn: (status: GoalStatus) => goalApi.changeStatus(goalId, status),
    onSuccess: () => {
      toast.success("状态已更新");
      invalidate();
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "状态更新失败"),
  });

  const contributeMut = useMutation({
    mutationFn: (payload: CreateContributionPayload) => goalApi.addContribution(goalId, payload),
    onSuccess: (res: ContributionResult) => {
      toast.success(
        res.reached_target ? `已达成目标！当前 ${formatCents(res.current_amount)}` : "已记录",
      );
      setContributeOpen(false);
      invalidate();
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "记录失败"),
  });

  const removeContributionMut = useMutation({
    mutationFn: (contributionId: string) => goalApi.removeContribution(goalId, contributionId),
    onSuccess: () => {
      toast.success("记录已删除");
      invalidate();
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "删除失败"),
  });

  const deleteMut = useMutation({
    mutationFn: () => goalApi.remove(goalId),
    onSuccess: () => {
      toast.success("目标已删除");
      navigate({ to: "/goals" });
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "删除失败"),
  });

  if (goalQuery.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (goalQuery.isError || !goal) {
    return (
      <div className="space-y-4">
        <BackLink />
        <Card>
          <CardContent className="p-6 text-sm text-destructive">
            加载失败：{(goalQuery.error as Error)?.message ?? "目标不存在或已被删除"}
          </CardContent>
        </Card>
      </div>
    );
  }

  const meta = GoalTypeMap[goal.goal_type];
  const status = GoalStatusMap[goal.status];
  const archived = goal.status === GoalStatus.ARCHIVED;
  const allowed = TRANSITIONS[goal.status] ?? [];
  const barValue = Math.min(Math.max(goal.progress, 0), 1) * 100;
  const verdict = compareForecast(forecast?.estimated_date, goal.deadline);

  const pauseToggle = allowed.includes(GoalStatus.PAUSED)
    ? GoalStatus.PAUSED
    : allowed.includes(GoalStatus.IN_PROGRESS)
      ? GoalStatus.IN_PROGRESS
      : null;

  return (
    <div className="space-y-6">
      <BackLink />

      {/* 头部 */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-muted text-2xl">
            {meta?.icon ?? "🎯"}
          </div>
          <div className="min-w-0">
            <h1 className="truncate font-display text-2xl font-semibold sm:text-3xl">
              {goal.name}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
              <span>{meta?.label ?? "其他"}</span>
              {status && (
                <Badge variant="secondary" className={cn("font-normal", status.color)}>
                  {status.label}
                </Badge>
              )}
              {goal.is_overdue && (
                <Badge
                  variant="secondary"
                  className="bg-destructive/15 font-normal text-destructive"
                >
                  已逾期
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button onClick={() => setContributeOpen(true)} disabled={archived}>
            <Wallet className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">追加资金</span>
            <span className="sm:hidden">追加</span>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setFormOpen(true)}>
                <Pencil className="mr-2 h-4 w-4" />
                编辑
              </DropdownMenuItem>
              {pauseToggle !== null && (
                <DropdownMenuItem onClick={() => statusMut.mutate(pauseToggle)}>
                  {pauseToggle === GoalStatus.PAUSED ? (
                    <Pause className="mr-2 h-4 w-4" />
                  ) : (
                    <Play className="mr-2 h-4 w-4" />
                  )}
                  {pauseToggle === GoalStatus.PAUSED ? "暂停" : "恢复"}
                </DropdownMenuItem>
              )}
              {allowed.includes(GoalStatus.COMPLETED) && (
                <DropdownMenuItem onClick={() => statusMut.mutate(GoalStatus.COMPLETED)}>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  标记完成
                </DropdownMenuItem>
              )}
              {allowed.includes(GoalStatus.ARCHIVED) && (
                <DropdownMenuItem onClick={() => statusMut.mutate(GoalStatus.ARCHIVED)}>
                  <Archive className="mr-2 h-4 w-4" />
                  归档
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setDeleteOpen(true)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                删除
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* 进度 */}
      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <span className="font-display text-3xl font-semibold tabular-nums">
              {formatCents(goal.current_amount)}
            </span>
            <span className="text-sm text-muted-foreground tabular-nums">
              目标 {formatCents(goal.target_amount)}
            </span>
          </div>

          <Progress value={barValue} className="h-3" />

          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-sm">
            <span className="text-muted-foreground">进度 {(goal.progress * 100).toFixed(1)}%</span>
            {goal.is_exceeded ? (
              <span className="text-emerald-600 dark:text-emerald-400">
                已超额 {formatCents(goal.current_amount - goal.target_amount)}
              </span>
            ) : (
              <span className="text-muted-foreground">
                还差 {formatCents(goal.remaining_amount)}
              </span>
            )}
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Metric
              label="剩余天数"
              value={
                goal.deadline == null
                  ? "—"
                  : goal.is_overdue
                    ? `已逾期 ${Math.abs(goal.remaining_days ?? 0)} 天`
                    : `${goal.remaining_days ?? 0} 天`
              }
            />
            <Metric
              label="月度建议储蓄"
              value={
                goal.monthly_suggested_saving != null
                  ? formatCents(goal.monthly_suggested_saving)
                  : goal.is_overdue
                    ? "需尽快补足"
                    : "—"
              }
            />
            <Metric
              label="预计达成"
              className="col-span-2 sm:col-span-1"
              value={
                forecastQuery.isLoading
                  ? "计算中…"
                  : forecast?.estimated_date
                    ? forecast.estimated_date
                    : "暂无法预测"
              }
              hint={
                forecast?.estimated_months != null
                  ? `约 ${forecast.estimated_months} 个月`
                  : undefined
              }
            />
          </div>

          {verdict && (
            <p
              className={cn(
                "text-xs",
                verdict.tone === "good" && "text-emerald-600 dark:text-emerald-400",
                verdict.tone === "warn" && "text-amber-600 dark:text-amber-400",
                verdict.tone === "neutral" && "text-muted-foreground",
              )}
            >
              {verdict.text}
              {goal.deadline && ` · 计划达成 ${goal.deadline}`}
            </p>
          )}

          {/* 预测口径说明：与 AI 助手同一套算法 */}
          <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
            <TrendingUp className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {forecast?.avg_monthly_saving != null ? (
              forecast.avg_monthly_saving > 0 ? (
                <span>
                  按近 12 个月月均结余 {formatCents(forecast.avg_monthly_saving)} 估算（与 AI
                  助手同口径）。
                </span>
              ) : (
                <span>
                  近 12 个月月均结余为负（{formatCents(forecast.avg_monthly_saving)}），
                  暂时无法预测达成时间，建议先优化收支结构。
                </span>
              )
            ) : (
              <span>预测需要近 12 个月的收支数据。</span>
            )}
          </p>

          <p className="text-xs text-muted-foreground">
            进度来源：手动追加（追加只标记用途，不会改动账户余额，也不计入净资产）。
          </p>
        </CardContent>
      </Card>

      {/* 追加记录 */}
      <Card>
        <CardContent className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">追加记录</h2>
            <span className="text-xs text-muted-foreground">{contributions.length} 条</span>
          </div>

          {contributionsQuery.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : contributions.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <Wallet className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">还没有追加记录，存第一笔试试？</p>
              <Button variant="outline" onClick={() => setContributeOpen(true)} disabled={archived}>
                <Wallet className="mr-2 h-4 w-4" />
                追加资金
              </Button>
            </div>
          ) : (
            <ul className="divide-y">
              {contributions.map((c) => (
                <li key={c.id} className="group flex items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span
                        className={cn(
                          "font-medium tabular-nums",
                          c.amount >= 0
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-amber-600 dark:text-amber-400",
                        )}
                      >
                        {c.amount >= 0 ? "+" : "−"}
                        {formatCents(Math.abs(c.amount))}
                      </span>
                      {c.note && (
                        <span className="truncate text-sm text-muted-foreground">{c.note}</span>
                      )}
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {formatDateTime(c.contributed_at)}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                    aria-label="删除该记录"
                    disabled={removeContributionMut.isPending}
                    onClick={() => removeContributionMut.mutate(c.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {goal.note && (
        <Card>
          <CardContent className="p-5">
            <h2 className="mb-2 font-display text-lg font-semibold">备注</h2>
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">{goal.note}</p>
          </CardContent>
        </Card>
      )}

      <GoalFormSheet
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={goal}
        onSubmit={(payload) => updateMut.mutate(payload)}
        submitting={updateMut.isPending}
      />

      <GoalContributeSheet
        open={contributeOpen}
        onOpenChange={setContributeOpen}
        goal={goal}
        onSubmit={(payload) => contributeMut.mutate(payload)}
        submitting={contributeMut.isPending}
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确定删除目标？</AlertDialogTitle>
            <AlertDialogDescription>
              删除「{goal.name}」后，它的 {contributions.length} 条追加记录也会一并移除，
              操作不可恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMut.isPending}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                deleteMut.mutate();
              }}
              disabled={deleteMut.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function BackLink() {
  return (
    <Link
      to="/goals"
      className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4" />
      返回目标列表
    </Link>
  );
}

function Metric({
  label,
  value,
  hint,
  className,
}: {
  label: string;
  value: string;
  hint?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col", className)}>
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="mt-1 truncate font-display text-lg font-semibold tabular-nums">{value}</span>
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </div>
  );
}
