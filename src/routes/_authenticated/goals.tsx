import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  Archive,
  CalendarClock,
  CheckCircle2,
  Loader2,
  MoreHorizontal,
  Pause,
  Pencil,
  Play,
  Plus,
  Target,
  Trash2,
  TrendingUp,
  Wallet,
} from "lucide-react";

import { ApiError } from "@/lib/api";
import {
  goalApi,
  type ContributionResult,
  type CreateContributionPayload,
  type CreateGoalPayload,
  type GoalItem,
  type GoalSummary,
  type UpdateGoalPayload,
} from "@/lib/api/goal";
import {
  GoalStatus,
  GoalStatusMap,
  GoalStatusOptions,
  GoalTypeMap,
  GoalTypeOptions,
} from "@/lib/constant";
import { formatCents, formatCentsCompact } from "@/lib/money";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

export const Route = createFileRoute("/_authenticated/goals")({
  head: () => ({
    meta: [
      { title: "财务目标 · Finora" },
      {
        name: "description",
        content: "建立应急金、旅行基金、买房首付等储蓄目标，追踪进度与预计达成时间。",
      },
    ],
  }),
  component: GoalsPage,
});

// 状态流转白名单，必须与后端 GoalService._ALLOWED_TRANSITIONS 保持一致。
const TRANSITIONS: Record<GoalStatus, GoalStatus[]> = {
  [GoalStatus.IN_PROGRESS]: [GoalStatus.PAUSED, GoalStatus.COMPLETED, GoalStatus.ARCHIVED],
  [GoalStatus.PAUSED]: [GoalStatus.IN_PROGRESS, GoalStatus.COMPLETED, GoalStatus.ARCHIVED],
  [GoalStatus.COMPLETED]: [GoalStatus.IN_PROGRESS, GoalStatus.ARCHIVED],
  [GoalStatus.ARCHIVED]: [GoalStatus.IN_PROGRESS],
};

const PAUSE_LABEL: Record<number, { label: string; icon: typeof Pause }> = {
  [GoalStatus.PAUSED]: { label: "暂停", icon: Pause },
  [GoalStatus.IN_PROGRESS]: { label: "恢复", icon: Play },
};

const CREATE_TEMPLATES = [
  { name: "6 个月应急金", goal_type: GoalTypeOptions[0].value, target_amount: 60_000 * 100 },
  { name: "旅行基金", goal_type: GoalTypeOptions[1].value, target_amount: 20_000 * 100 },
  { name: "买房首付", goal_type: GoalTypeOptions[2].value, target_amount: 500_000 * 100 },
];

function GoalsPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<"all" | GoalStatus>("all");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<GoalItem | null>(null);
  const [preset, setPreset] = useState<CreateGoalPayload | null>(null);
  const [contributing, setContributing] = useState<GoalItem | null>(null);
  const [deleting, setDeleting] = useState<GoalItem | null>(null);

  const listQuery = useQuery({
    queryKey: ["goals", statusFilter, overdueOnly],
    queryFn: () =>
      goalApi.list({
        ...(statusFilter === "all" ? {} : { status: statusFilter }),
        ...(overdueOnly ? { overdue: true } : {}),
      }),
  });

  const summaryQuery = useQuery({
    queryKey: ["goals", "summary"],
    queryFn: () => goalApi.summary(),
  });

  const goals = listQuery.data ?? [];
  const summary: GoalSummary | undefined = summaryQuery.data;

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["goals"] });

  const createMut = useMutation({
    mutationFn: (payload: CreateGoalPayload) => goalApi.create(payload),
    onSuccess: () => {
      toast.success("目标已创建");
      setFormOpen(false);
      setPreset(null);
      invalidate();
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "创建失败"),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateGoalPayload }) =>
      goalApi.update(id, payload),
    onSuccess: () => {
      toast.success("已保存");
      setFormOpen(false);
      setEditing(null);
      invalidate();
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "保存失败"),
  });

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: GoalStatus }) =>
      goalApi.changeStatus(id, status),
    onSuccess: () => {
      toast.success("状态已更新");
      invalidate();
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "状态更新失败"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => goalApi.remove(id),
    onSuccess: () => {
      toast.success("目标已删除");
      setDeleting(null);
      invalidate();
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "删除失败"),
  });

  const contributeMut = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: CreateContributionPayload }) =>
      goalApi.addContribution(id, payload),
    onSuccess: (res: ContributionResult) => {
      toast.success(
        res.reached_target ? `已达成目标！当前 ${formatCents(res.current_amount)}` : "已记录",
      );
      setContributing(null);
      invalidate();
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "记录失败"),
  });

  const handleFormSubmit = (
    payload: CreateGoalPayload | UpdateGoalPayload,
    editingId: string | null,
  ) => {
    if (editingId) updateMut.mutate({ id: editingId, payload: payload as UpdateGoalPayload });
    else createMut.mutate(payload as CreateGoalPayload);
  };

  const openCreate = (tpl?: (typeof CREATE_TEMPLATES)[number]) => {
    setEditing(null);
    setPreset(tpl ?? null);
    setFormOpen(true);
  };

  const isFiltered = statusFilter !== "all" || overdueOnly;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-3xl font-semibold">财务目标</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            为目标存钱，而不是为花钱记账。把首付、应急金、旅行基金变成可追踪的进度。
          </p>
        </div>
        <Button onClick={() => openCreate()} className="shrink-0">
          <Plus className="mr-2 h-4 w-4" />
          <span className="hidden sm:inline">新建目标</span>
          <span className="sm:hidden">新建</span>
        </Button>
      </div>

      {summary && summary.total_count > 0 && (
        <Card>
          <CardContent className="p-5">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <StatCell label="目标总数" value={String(summary.total_count)} />
              <StatCell
                label="总目标金额"
                value={formatCentsCompact(summary.total_target_amount)}
              />
              <StatCell label="已累计" value={formatCentsCompact(summary.total_current_amount)} />
              <StatCell
                label="整体进度"
                value={`${(summary.overall_progress * 100).toFixed(1)}%`}
              />
            </div>
            <Progress
              className="mt-4 h-2"
              value={Math.min(Math.max(summary.overall_progress, 0), 1) * 100}
            />
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs
          value={statusFilter === "all" ? "all" : String(statusFilter)}
          onValueChange={(v) => setStatusFilter(v === "all" ? "all" : (Number(v) as GoalStatus))}
        >
          <TabsList className="flex h-auto flex-wrap">
            <TabsTrigger value="all">全部</TabsTrigger>
            {GoalStatusOptions.map((s) => (
              <TabsTrigger key={s.value} value={String(s.value)}>
                {s.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <Button
          variant={overdueOnly ? "default" : "outline"}
          size="sm"
          className="self-start sm:self-auto"
          onClick={() => setOverdueOnly((v) => !v)}
        >
          <AlertTriangle className="mr-2 h-4 w-4" />
          只看逾期
        </Button>
      </div>

      {listQuery.isLoading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-44 w-full" />
          ))}
        </div>
      ) : listQuery.isError ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-6 text-center text-sm">
            <span className="text-destructive">
              加载失败：{(listQuery.error as Error)?.message ?? "未知错误"}
            </span>
            <Button variant="outline" onClick={() => listQuery.refetch()}>
              重试
            </Button>
          </CardContent>
        </Card>
      ) : goals.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-4 py-16 text-center">
            <Target className="h-10 w-10 text-muted-foreground" />
            <div className="space-y-1">
              <div className="font-medium">
                {isFiltered ? "没有符合条件的目标" : "还没有目标，先建一个吧"}
              </div>
              <div className="text-sm text-muted-foreground">
                {isFiltered
                  ? "换个筛选条件试试。"
                  : "从一个具体的目标开始，比「多存点钱」更容易坚持。"}
              </div>
            </div>
            {!isFiltered && (
              <div className="flex flex-wrap justify-center gap-2">
                {CREATE_TEMPLATES.map((tpl) => (
                  <Button key={tpl.name} variant="outline" onClick={() => openCreate(tpl)}>
                    {GoalTypeMap[tpl.goal_type]?.icon} {tpl.name}
                  </Button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {goals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onContribute={() => setContributing(goal)}
              onEdit={() => {
                setEditing(goal);
                setPreset(null);
                setFormOpen(true);
              }}
              onDelete={() => setDeleting(goal)}
              onStatus={(status) => statusMut.mutate({ id: goal.id, status })}
            />
          ))}
        </div>
      )}

      <GoalFormSheet
        open={formOpen}
        onOpenChange={(v) => {
          setFormOpen(v);
          if (!v) {
            setEditing(null);
            setPreset(null);
          }
        }}
        editing={editing}
        preset={preset}
        onSubmit={handleFormSubmit}
        submitting={createMut.isPending || updateMut.isPending}
      />

      <GoalContributeSheet
        open={!!contributing}
        onOpenChange={(v) => !v && setContributing(null)}
        goal={contributing}
        onSubmit={(payload) =>
          contributing && contributeMut.mutate({ id: contributing.id, payload })
        }
        submitting={contributeMut.isPending}
      />

      <AlertDialog open={!!deleting} onOpenChange={(v) => !v && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确定删除目标？</AlertDialogTitle>
            <AlertDialogDescription>
              删除「{deleting?.name}」后，它的追加记录也会一并移除，操作不可恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMut.isPending}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (deleting) deleteMut.mutate(deleting.id);
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

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-col">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="mt-1 truncate font-display text-xl font-semibold tabular-nums sm:text-2xl">
        {value}
      </span>
    </div>
  );
}

function GoalCard({
  goal,
  onContribute,
  onEdit,
  onDelete,
  onStatus,
}: {
  goal: GoalItem;
  onContribute: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onStatus: (status: GoalStatus) => void;
}) {
  const meta = GoalTypeMap[goal.goal_type];
  const status = GoalStatusMap[goal.status];
  const archived = goal.status === GoalStatus.ARCHIVED;

  // 进度条封顶 100%，超额部分用文案表达（需求文档 §11）。
  const barValue = Math.min(Math.max(goal.progress, 0), 1) * 100;

  const allowed = TRANSITIONS[goal.status] ?? [];
  const pauseToggle = allowed.includes(GoalStatus.PAUSED)
    ? GoalStatus.PAUSED
    : allowed.includes(GoalStatus.IN_PROGRESS)
      ? GoalStatus.IN_PROGRESS
      : null;
  const PauseIcon = pauseToggle !== null ? PAUSE_LABEL[pauseToggle].icon : null;

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-lg">
              {meta?.icon ?? "🎯"}
            </div>
            <div className="min-w-0">
              <Link
                to="/goals/$goalId"
                params={{ goalId: goal.id }}
                className="block truncate font-medium hover:underline"
              >
                {goal.name}
              </Link>
              <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
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

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onContribute} disabled={archived}>
                <Wallet className="mr-2 h-4 w-4" />
                追加资金
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onEdit}>
                <Pencil className="mr-2 h-4 w-4" />
                编辑
              </DropdownMenuItem>
              {pauseToggle !== null && PauseIcon && (
                <DropdownMenuItem onClick={() => onStatus(pauseToggle)}>
                  <PauseIcon className="mr-2 h-4 w-4" />
                  {PAUSE_LABEL[pauseToggle].label}
                </DropdownMenuItem>
              )}
              {allowed.includes(GoalStatus.COMPLETED) && (
                <DropdownMenuItem onClick={() => onStatus(GoalStatus.COMPLETED)}>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  标记完成
                </DropdownMenuItem>
              )}
              {allowed.includes(GoalStatus.ARCHIVED) && (
                <DropdownMenuItem onClick={() => onStatus(GoalStatus.ARCHIVED)}>
                  <Archive className="mr-2 h-4 w-4" />
                  归档
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={onDelete}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                删除
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="mt-4 space-y-2">
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-display text-xl font-semibold tabular-nums">
              {formatCents(goal.current_amount)}
            </span>
            <span className="shrink-0 text-sm text-muted-foreground tabular-nums">
              / {formatCents(goal.target_amount)}
            </span>
          </div>
          <Progress value={barValue} className="h-2" />
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span>{(goal.progress * 100).toFixed(1)}%</span>
            {goal.is_exceeded ? (
              <span className="text-emerald-600 dark:text-emerald-400">
                已超额 {formatCents(goal.current_amount - goal.target_amount)}
              </span>
            ) : (
              <span>还差 {formatCents(goal.remaining_amount)}</span>
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 border-t pt-3 text-xs text-muted-foreground">
          {goal.deadline && (
            <span className="inline-flex items-center gap-1">
              <CalendarClock className="h-3.5 w-3.5" />
              {goal.is_overdue
                ? `已逾期 ${Math.abs(goal.remaining_days ?? 0)} 天`
                : `剩余 ${goal.remaining_days ?? 0} 天`}
            </span>
          )}
          {goal.monthly_suggested_saving != null && (
            <span>月度建议 {formatCents(goal.monthly_suggested_saving)}</span>
          )}
          {goal.estimated_months != null && (
            <span className="inline-flex items-center gap-1">
              <TrendingUp className="h-3.5 w-3.5" />
              预计 {goal.estimated_months} 个月达成
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
