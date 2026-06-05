import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Wallet,
  CreditCard,
  Banknote,
  Smartphone,
  PiggyBank,
  MoreHorizontal,
  Plus,
  Pencil,
  Trash2,
  Loader2,
} from "lucide-react";

import {ApiError} from '@/lib/api'
import {
  accountApi,
  type AccountListItem,
  type AccountDetail,
  type CreateAccountPayload,
  type UpdateAccountPayload,
} from "@/lib/api/account";
import {AccountStatus, AccountType} from '@/lib/constant'
import { defineMap } from "@/utils/enum";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/accounts")({
  head: () => ({ meta: [{ title: "账户管理 · NetWorthLens" }] }),
  component: AccountsPage,
});

// ---------------- 枚举 ----------------

const ACCOUNT_TYPES = [
  { value: 1, label: "储蓄卡", icon: Wallet, tone: "text-sky-500" },
  { value: 2, label: "现金", icon: Banknote, tone: "text-emerald-500" },
  { value: 3, label: "信用卡", icon: CreditCard, tone: "text-rose-500" },
  { value: 4, label: "支付宝", icon: Smartphone, tone: "text-blue-500" },
  { value: 5, label: "微信", icon: Smartphone, tone: "text-green-500" },
  { value: 6, label: "其他", icon: PiggyBank, tone: "text-muted-foreground" },
] as const;

type AccountTypeDef = {
  value: number;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: string;
};

const ACCOUNT_TYPE_MAP = defineMap(
  ACCOUNT_TYPES as unknown as AccountTypeDef[],
  "value",
  ["label", "icon", "tone"],
) as Record<number, { label: string; icon: AccountTypeDef["icon"]; tone: string }>;

const ACCOUNT_STATUSES = [
  { value: 1, label: "正常", color: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300" },
  { value: 2, label: "已停用", color: "bg-muted text-muted-foreground" },
] as const;

const STATUS_MAP = defineMap(
  ACCOUNT_STATUSES as unknown as { value: number; label: string; color: string }[],
  "value",
  ["label", "color"],
) as Record<number, { label: string; color: string }>;

const CURRENCIES = ["CNY", "USD", "EUR", "JPY", "HKD", "GBP"] as const;

// ---------------- 工具 ----------------

const formatAmount = (cents: number, currency = "CNY") => {
  const value = (cents ?? 0) / 100;
  try {
    return new Intl.NumberFormat("zh-CN", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
};

// ---------------- 表单 Dialog ----------------

interface FormState {
  account_type: AccountType;
  name: string;
  currency: string;
  balance: string; // 元，字符串方便输入
  status: AccountStatus;
}

const EMPTY_FORM: FormState = {
  account_type: 1,
  name: "",
  currency: "CNY",
  balance: "0",
  status: 1,
};

function AccountFormDialog({
  open,
  onOpenChange,
  editing,
  detail,
  onSubmit,
  submitting,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: AccountListItem | null;
  detail: AccountDetail | null;
  onSubmit: (form: FormState) => void;
  submitting: boolean;
}) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  // 当打开 / editing / detail 变化时同步表单（优先使用 detail 的最新数据）
  useEffect(() => {
    if (!open) return;
    if (editing) {
      const src = detail ?? editing;
      setForm({
        account_type: src.account_type as AccountType,
        name: src.name,
        currency: src.currency,
        balance: ((src.balance ?? 0) / 100).toString(),
        status: src.status as AccountStatus,
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [open, editing, detail]);


  const isEdit = !!editing;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "编辑账户" : "新增账户"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "更新账户名称、余额或启用状态。" : "添加银行卡、现金、信用卡等账户。"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid gap-2">
            <Label>账户类型</Label>
            <Select
              value={String(form.account_type)}
              disabled={isEdit}
              onValueChange={(v) =>
                setForm((f) => ({ ...f, account_type: Number(v) as AccountType }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACCOUNT_TYPES.map((t) => (
                  <SelectItem key={t.value} value={String(t.value)}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="account-name">账户名称</Label>
            <Input
              id="account-name"
              placeholder="如：招商银行储蓄卡"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>币种</Label>
              <Select
                value={form.currency}
                disabled={isEdit}
                onValueChange={(v) => setForm((f) => ({ ...f, currency: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="account-balance">{isEdit ? "余额" : "初始余额"}</Label>
              <Input
                id="account-balance"
                type="number"
                step="0.01"
                inputMode="decimal"
                value={form.balance}
                onChange={(e) => setForm((f) => ({ ...f, balance: e.target.value }))}
              />
            </div>
          </div>

          {isEdit && (
            <>
              {editing.account_type === 3 && detail && (
                <div className="grid grid-cols-2 gap-3 rounded-lg bg-muted p-3">
                  <div>
                    <div className="text-xs text-muted-foreground">信用额度</div>
                    <div className="mt-0.5 text-sm font-medium">
                      {formatAmount(detail.credit_limit ?? 0, editing.currency)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">可用额度</div>
                    <div className="mt-0.5 text-sm font-medium">
                      {formatAmount(detail.available_balance ?? 0, editing.currency)}
                    </div>
                  </div>
                </div>
              )}
              <div className="grid gap-2">
                <Label>状态</Label>
                <Select
                  value={String(form.status)}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, status: Number(v) as AccountStatus }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACCOUNT_STATUSES.map((s) => (
                      <SelectItem key={s.value} value={String(s.value)}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            取消
          </Button>
          <Button
            onClick={() => {
              if (!form.name.trim()) {
                toast.error("请输入账户名称");
                return;
              }
              onSubmit(form);
            }}
            disabled={submitting}
          >
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEdit ? "保存" : "创建"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------- 页面 ----------------

function AccountsPage() {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AccountListItem | null>(null);
  const [detail, setDetail] = useState<AccountDetail | null>(null);
  const [fetchingDetail, setFetchingDetail] = useState(false);
  const [deleting, setDeleting] = useState<AccountListItem | null>(null);

  const { data: accounts, isLoading, isError, error } = useQuery({
    queryKey: ["accounts"],
    queryFn: () => accountApi.list(),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["accounts"] });

  const createMut = useMutation({
    mutationFn: (payload: CreateAccountPayload) => accountApi.create(payload),
    onSuccess: () => {
      toast.success("账户已创建");
      setFormOpen(false);
      invalidate();
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "创建失败"),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateAccountPayload }) =>
      accountApi.update(id, payload),
    onSuccess: () => {
      toast.success("已保存");
      setFormOpen(false);
      setEditing(null);
      invalidate();
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "保存失败"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => accountApi.remove(id),
    onSuccess: () => {
      toast.success("账户已删除");
      setDeleting(null);
      invalidate();
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "删除失败"),
  });

  const handleSubmit = (form: FormState) => {
    const balanceCents = Math.round(Number(form.balance || 0) * 100);
    if (editing) {
      const payload: UpdateAccountPayload = {
        name: form.name.trim(),
        balance: balanceCents,
        status: form.status,
      };
      updateMut.mutate({ id: editing.id, payload });
    } else {
      const payload: CreateAccountPayload = {
        account_type: form.account_type,
        name: form.name.trim(),
        currency: form.currency,
        balance: balanceCents,
      };
      createMut.mutate(payload);
    }
  };

  const handleEdit = async (acc: AccountListItem) => {
    setFetchingDetail(true);
    try {
      const d = await accountApi.get(acc.id);
      setDetail(d);
      setEditing(acc);
      setFormOpen(true);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "获取账户详情失败");
    } finally {
      setFetchingDetail(false);
    }
  };

  // 汇总（仅按币种分组）
  const totalsByCurrency = (accounts ?? []).reduce<Record<string, number>>((acc, a) => {
    if (a.status !== 1) return acc;
    acc[a.currency] = (acc[a.currency] ?? 0) + a.balance;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold">账户管理</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            管理你的银行卡、现金、信用卡等账户余额。
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          新增账户
        </Button>
      </div>

      {/* 汇总卡片 */}
      {Object.keys(totalsByCurrency).length > 0 && (
        <Card>
          <CardContent className="flex flex-wrap gap-6 p-5">
            {Object.entries(totalsByCurrency).map(([cur, sum]) => (
              <div key={cur} className="flex flex-col">
                <span className="text-xs text-muted-foreground">{cur} 总余额</span>
                <span className="mt-1 font-display text-2xl font-semibold">
                  {formatAmount(sum, cur)}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* 列表 */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : isError ? (
        <Card>
          <CardContent className="p-6 text-sm text-destructive">
            加载失败：{(error as Error)?.message ?? "未知错误"}
          </CardContent>
        </Card>
      ) : !accounts || accounts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <Wallet className="h-10 w-10 text-muted-foreground" />
            <div className="text-sm text-muted-foreground">还没有账户，先添加一个吧</div>
            <Button
              variant="outline"
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              新增账户
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {accounts.map((acc) => {
            const meta = ACCOUNT_TYPE_MAP[acc.account_type] ?? {
              label: "未知",
              icon: Wallet,
              tone: "text-muted-foreground",
            };
            const status = STATUS_MAP[acc.status] ?? {
              label: "未知",
              color: "bg-muted text-muted-foreground",
            };
            const Icon = meta.icon;
            return (
              <Card key={acc.id} className="group relative overflow-hidden">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={cn(
                          "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted",
                          meta.tone,
                        )}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="truncate text-sm font-semibold">{acc.name}</h3>
                          <Badge variant="secondary" className={status.color}>
                            {status.label}
                          </Badge>
                        </div>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {meta.label} · {acc.currency}
                        </p>
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => handleEdit(acc)}
                          disabled={fetchingDetail}
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          编辑
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => setDeleting(acc)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          删除
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="mt-4">
                    <div className="text-xs text-muted-foreground">当前余额</div>
                    <div className="mt-1 font-display text-2xl font-semibold tabular-nums">
                      {formatAmount(acc.balance, acc.currency)}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <AccountFormDialog
        open={formOpen}
        onOpenChange={(v) => {
          setFormOpen(v);
          if (!v) {
            setEditing(null);
            setDetail(null);
          }
        }}
        editing={editing}
        detail={detail}
        onSubmit={handleSubmit}
        submitting={createMut.isPending || updateMut.isPending || fetchingDetail}
      />

      <AlertDialog open={!!deleting} onOpenChange={(v) => !v && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除账户「{deleting?.name}」？</AlertDialogTitle>
            <AlertDialogDescription>
              删除后该账户及相关数据将无法恢复，确定要继续吗？
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
