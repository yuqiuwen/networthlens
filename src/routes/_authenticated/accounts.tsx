import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { REGEXP_ONLY_DIGITS } from "input-otp";
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
  Eye,
  EyeOff,
} from "lucide-react";

import { ApiError } from "@/lib/api";
import {
  accountApi,
  type AccountListItem,
  type AccountDetail,
  type AccountBalance,
  type CreateAccountPayload,
  type UpdateAccountPayload,
} from "@/lib/api/account";
import { secretApi } from "@/lib/api/secret";
import { AccountStatus, AccountType } from "@/lib/constant";
import { defineMap } from "@/utils/enum";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
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
  { value: 1, label: "储蓄卡", icon: Wallet, tone: "text-sky-500", surface: "bg-sky-500/10" },
  {
    value: 2,
    label: "现金",
    icon: Banknote,
    tone: "text-emerald-500",
    surface: "bg-emerald-500/10",
  },
  { value: 3, label: "信用卡", icon: CreditCard, tone: "text-rose-500", surface: "bg-rose-500/10" },
  { value: 4, label: "支付宝", icon: Smartphone, tone: "text-blue-500", surface: "bg-blue-500/10" },
  { value: 5, label: "微信", icon: Smartphone, tone: "text-green-500", surface: "bg-green-500/10" },
  { value: 6, label: "其他", icon: PiggyBank, tone: "text-muted-foreground", surface: "bg-muted" },
] as const;

type AccountTypeDef = {
  value: number;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: string;
  surface: string;
};

const ACCOUNT_TYPE_MAP = defineMap(ACCOUNT_TYPES as unknown as AccountTypeDef[], "value", [
  "label",
  "icon",
  "tone",
  "surface",
]) as Record<
  number,
  { label: string; icon: AccountTypeDef["icon"]; tone: string; surface: string }
>;

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
  note: string;
  icon: string;
}

const EMPTY_FORM: FormState = {
  account_type: 1,
  name: "",
  currency: "CNY",
  balance: "0",
  status: 1,
  note: "",
  icon: "",
};

function isSvgMarkup(value: string) {
  return /^(?:<\?xml[^>]*\?>\s*)?<svg\b[\s\S]*<\/svg>\s*$/i.test(value);
}

function AccountCardVisual({
  svg,
  Icon,
  tone,
  surface,
}: {
  svg?: string | null;
  Icon: AccountTypeDef["icon"];
  tone: string;
  surface: string;
}) {
  const svgMarkup = svg?.trim();

  if (svgMarkup) {
    return (
      <img
        src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgMarkup)}`}
        alt=""
        className="h-full w-full object-cover object-top"
      />
    );
  }

  return (
    <div className={cn("relative grid h-full w-full place-items-center overflow-hidden", surface)}>
      <div className="absolute inset-x-0 top-0 h-2/5 bg-background/30" />
      <div className="absolute -bottom-8 left-[16%] h-44 w-16 -skew-x-12 border-x border-foreground/10 bg-background/20" />
      <div className="absolute -right-8 top-4 h-32 w-20 -skew-x-12 border-x border-foreground/10 bg-background/20" />
      <Icon className={cn("relative h-14 w-14", tone)} />
    </div>
  );
}

function AccountFormDialog({
  open,
  onOpenChange,
  editing,
  detail,
  balance,
  balanceVisible,
  onRequestBalance,
  onHideBalance,
  balanceLoading,
  onSubmit,
  submitting,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: AccountListItem | null;
  detail: AccountDetail | null;
  balance: AccountBalance | null;
  balanceVisible: boolean;
  onRequestBalance: () => void;
  onHideBalance: () => void;
  balanceLoading: boolean;
  onSubmit: (form: FormState) => void;
  submitting: boolean;
}) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  // 当打开 / editing / detail 变化时同步表单（优先使用 detail 的最新数据）
  useEffect(() => {
    if (!open) return;
    if (editing) {
      setForm({
        account_type: editing.account_type,
        name: editing.name,
        currency: editing.currency,
        balance: "",
        status: editing.status,
        note: detail?.note ?? "",
        icon: detail?.icon ?? editing.icon ?? "",
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [open, editing, detail]);

  useEffect(() => {
    if (!balanceVisible || !balance || !editing) return;
    setForm((current) => ({ ...current, balance: (balance.balance / 100).toString() }));
  }, [balance, balanceVisible, editing]);

  const isEdit = !!editing;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
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
              <div className="flex items-center gap-2">
                <Input
                  id="account-balance"
                  type={isEdit && !balanceVisible ? "text" : "number"}
                  step="0.01"
                  inputMode="decimal"
                  value={isEdit && !balanceVisible ? "••••••" : form.balance}
                  disabled={isEdit && !balanceVisible}
                  onChange={(e) => setForm((f) => ({ ...f, balance: e.target.value }))}
                  placeholder={isEdit && !balanceVisible ? "验证后显示余额" : undefined}
                />
                {isEdit && (
                  <AmountVisibilityButton
                    visible={balanceVisible}
                    onClick={() => {
                      if (balanceVisible) {
                        setForm((current) => ({ ...current, balance: "" }));
                        onHideBalance();
                      } else {
                        onRequestBalance();
                      }
                    }}
                    disabled={balanceLoading}
                  />
                )}
              </div>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="account-note">备注</Label>
            <Textarea
              id="account-note"
              value={form.note}
              onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))}
              maxLength={100}
              placeholder="选填，最多 100 个字符"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="account-icon">图标 SVG</Label>
            <Textarea
              id="account-icon"
              value={form.icon}
              onChange={(event) => setForm((current) => ({ ...current, icon: event.target.value }))}
              className="min-h-32 font-mono text-xs leading-5"
              placeholder={'<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">...</svg>'}
              spellCheck={false}
            />
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
              if (form.icon.trim() && !isSvgMarkup(form.icon.trim())) {
                toast.error("图标请填写完整的 SVG 代码");
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

function AmountVisibilityDialog({
  open,
  onOpenChange,
  onSubmit,
  submitting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (code: string) => void;
  submitting: boolean;
}) {
  const [code, setCode] = useState("");
  const [submittedCode, setSubmittedCode] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setCode("");
      setSubmittedCode(null);
    }
  }, [open]);

  useEffect(() => {
    if (open && !submitting && code.length === 6 && code !== submittedCode) {
      setSubmittedCode(code);
      onSubmit(code);
    }
  }, [code, onSubmit, open, submittedCode, submitting]);

  const handleOpenChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>显示账户金额</DialogTitle>
          <DialogDescription></DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="flex justify-center">
            <InputOTP
              maxLength={6}
              value={code}
              onChange={setCode}
              pattern={REGEXP_ONLY_DIGITS}
              type="password"
              inputMode="numeric"
              disabled={submitting}
              autoFocus
              aria-label="6 位数字查看密钥"
            >
              <InputOTPGroup>
                {Array.from({ length: 6 }, (_, index) => (
                  <InputOTPSlot key={index} index={index} />
                ))}
              </InputOTPGroup>
            </InputOTP>
          </div>
          <div className="flex h-4 items-center justify-center" aria-live="polite">
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AmountVisibilityButton({
  visible,
  onClick,
  disabled = false,
}: {
  visible: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  const Icon = visible ? EyeOff : Eye;
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-8 w-8 shrink-0"
      aria-label={visible ? "隐藏金额" : "显示金额"}
      title={visible ? "隐藏金额" : "显示金额"}
      onClick={onClick}
      disabled={disabled}
    >
      <Icon className="h-4 w-4" />
    </Button>
  );
}

type VisibilityTarget =
  | { scope: "all" }
  | {
      scope: "account";
      accountId: string;
    };

// ---------------- 页面 ----------------

function AccountsPage() {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AccountListItem | null>(null);
  const [detail, setDetail] = useState<AccountDetail | null>(null);
  const [fetchingDetail, setFetchingDetail] = useState(false);
  const [deleting, setDeleting] = useState<AccountListItem | null>(null);
  const [amountsVisible, setAmountsVisible] = useState(false);
  const [visibleAccountIds, setVisibleAccountIds] = useState<Set<string>>(() => new Set());
  const [hiddenAccountIds, setHiddenAccountIds] = useState<Set<string>>(() => new Set());
  const [balancesById, setBalancesById] = useState<Record<string, AccountBalance>>({});
  const [formBalanceVisible, setFormBalanceVisible] = useState(false);
  const [visibilityTarget, setVisibilityTarget] = useState<VisibilityTarget | null>(null);

  const {
    data: accounts,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["accounts"],
    queryFn: () => accountApi.list(),
  });
  const secretStatusQuery = useQuery({
    queryKey: ["secret-status"],
    queryFn: secretApi.status,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["accounts"] });
    setAmountsVisible(false);
    setVisibleAccountIds(new Set());
    setHiddenAccountIds(new Set());
    setBalancesById({});
    setFormBalanceVisible(false);
  };

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

  const balanceMut = useMutation({
    mutationFn: ({ target, code }: { target: VisibilityTarget; code: string }) =>
      accountApi.balances({
        code,
        accountId: target.scope === "account" ? target.accountId : undefined,
      }),
    onSuccess: (balances, { target }) => {
      setBalancesById((current) => {
        const next = { ...current };
        for (const balance of balances) next[balance.id] = balance;
        return next;
      });
      if (target.scope === "all") {
        setAmountsVisible(true);
        setVisibleAccountIds(new Set());
        setHiddenAccountIds(new Set());
      } else {
        setVisibleAccountIds((current) => new Set(current).add(target.accountId));
        setHiddenAccountIds((current) => {
          const next = new Set(current);
          next.delete(target.accountId);
          return next;
        });
        if (formOpen && editing?.id === target.accountId) setFormBalanceVisible(true);
      }
      setVisibilityTarget(null);
      toast.success("金额已显示");
    },
    onError: (err) => {
      setVisibilityTarget(null);
      toast.error(err instanceof ApiError ? err.message : "余额查询失败");
    },
  });

  const verifySecretMut = useMutation({
    mutationFn: ({ code }: { code: string; target: VisibilityTarget }) =>
      secretApi.verify({ code }),
    onSuccess: (encryptedCode, { target }) => {
      balanceMut.mutate({ target, code: encryptedCode });
    },
    onError: (err) => {
      setVisibilityTarget(null);
      toast.error(err instanceof ApiError ? err.message : "查看密钥验证失败");
    },
  });

  const requestAmountVisibility = (target: VisibilityTarget) => {
    if (secretStatusQuery.isLoading) {
      toast.info("正在检查查看密钥状态");
      return;
    }
    if (!secretStatusQuery.data?.configured) {
      toast.error("请先在个人中心设置 6 位数字查看密钥");
      return;
    }
    setVisibilityTarget(target);
  };

  const toggleAmounts = () => {
    if (amountsVisible) {
      setAmountsVisible(false);
      setVisibleAccountIds(new Set());
      setHiddenAccountIds(new Set());
      setBalancesById({});
      setFormBalanceVisible(false);
      return;
    }
    requestAmountVisibility({ scope: "all" });
  };

  const isAccountAmountVisible = (accountId: string) =>
    Boolean(balancesById[accountId]) &&
    (amountsVisible ? !hiddenAccountIds.has(accountId) : visibleAccountIds.has(accountId));

  const toggleAccountAmount = (accountId: string) => {
    if (!isAccountAmountVisible(accountId)) {
      requestAmountVisibility({ scope: "account", accountId });
      return;
    }
    if (amountsVisible) {
      setHiddenAccountIds((current) => new Set(current).add(accountId));
      setBalancesById((current) => {
        const next = { ...current };
        delete next[accountId];
        return next;
      });
    } else {
      setVisibleAccountIds((current) => {
        const next = new Set(current);
        next.delete(accountId);
        return next;
      });
      setBalancesById((current) => {
        const next = { ...current };
        delete next[accountId];
        return next;
      });
    }
  };

  const handleSubmit = (form: FormState) => {
    if (editing) {
      const payload: UpdateAccountPayload = {
        name: form.name.trim(),
        status: form.status,
        note: form.note.trim() || null,
        icon: form.icon.trim() || null,
      };
      if (form.balance.trim()) {
        payload.balance = Math.round(Number(form.balance) * 100);
      }
      updateMut.mutate({ id: editing.id, payload });
    } else {
      const balanceCents = Math.round(Number(form.balance || 0) * 100);
      const payload: CreateAccountPayload = {
        account_type: form.account_type,
        name: form.name.trim(),
        currency: form.currency,
        balance: balanceCents,
        note: form.note.trim() || null,
        icon: form.icon.trim() || null,
      };
      createMut.mutate(payload);
    }
  };

  const handleEdit = async (acc: AccountListItem) => {
    setFormBalanceVisible(false);
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
  const totalsByCurrency = amountsVisible
    ? (accounts ?? []).reduce<Record<string, number>>((acc, a) => {
        if (a.status !== 1) return acc;
        const balance = balancesById[a.id];
        if (!balance) return acc;
        acc[a.currency] = (acc[a.currency] ?? 0) + balance.balance;
        return acc;
      }, {})
    : {};

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold">账户管理</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            管理你的银行卡、现金、信用卡等账户余额。
          </p>
        </div>
        <div className="flex items-center gap-2">
          <AmountVisibilityButton visible={amountsVisible} onClick={toggleAmounts} />
          <Button
            onClick={() => {
              setEditing(null);
              setFormBalanceVisible(false);
              setFormOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            新增账户
          </Button>
        </div>
      </div>

      {/* 汇总卡片 */}
      {Object.keys(totalsByCurrency).length > 0 && (
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-6 p-5">
            <div className="flex flex-wrap gap-6">
              {Object.entries(totalsByCurrency).map(([cur, sum]) => (
                <div key={cur} className="flex flex-col">
                  <span className="text-xs text-muted-foreground">{cur} 总余额</span>
                  <span className="mt-1 font-display text-2xl font-semibold tabular-nums">
                    {amountsVisible ? formatAmount(sum, cur) : `${cur} ••••••`}
                  </span>
                </div>
              ))}
            </div>
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
                setFormBalanceVisible(false);
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
              surface: "bg-muted",
            };
            const status = STATUS_MAP[acc.status] ?? {
              label: "未知",
              color: "bg-muted text-muted-foreground",
            };
            const Icon = meta.icon;
            const accountBalance = balancesById[acc.id];
            const accountAmountVisible = isAccountAmountVisible(acc.id);
            return (
              <Card key={acc.id} className="group relative overflow-hidden">
                <CardContent className="grid aspect-[4/3] min-h-64 grid-rows-[2fr_1fr] p-0">
                  <div className="relative min-h-0 overflow-hidden bg-muted">
                    <AccountCardVisual
                      svg={acc.icon}
                      Icon={Icon}
                      tone={meta.tone}
                      surface={meta.surface}
                    />
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="secondary"
                          size="icon"
                          className="pointer-events-none absolute right-3 top-3 h-8 w-8 opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100 focus-visible:pointer-events-auto focus-visible:opacity-100 bg-background/80 shadow-sm backdrop-blur-sm"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(acc)} disabled={fetchingDetail}>
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

                  <div className="flex min-h-0 flex-col justify-between gap-1 border-t p-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="truncate text-sm font-semibold">{acc.name}</h3>
                        <Badge variant="secondary" className={cn("shrink-0", status.color)}>
                          {status.label}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex items-end justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-xs text-muted-foreground">
                          {meta.label} · {acc.currency}
                        </div>
                        <div className="truncate font-display text-lg font-semibold tabular-nums">
                          {accountAmountVisible
                            ? formatAmount(accountBalance?.balance ?? 0, acc.currency)
                            : `${acc.currency} ••••••`}
                        </div>
                      </div>
                      <AmountVisibilityButton
                        visible={accountAmountVisible}
                        onClick={() => toggleAccountAmount(acc.id)}
                      />
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
            setFormBalanceVisible(false);
          }
        }}
        editing={editing}
        detail={detail}
        balance={editing ? (balancesById[editing.id] ?? null) : null}
        balanceVisible={formBalanceVisible}
        onRequestBalance={() => {
          if (editing) requestAmountVisibility({ scope: "account", accountId: editing.id });
        }}
        onHideBalance={() => setFormBalanceVisible(false)}
        balanceLoading={verifySecretMut.isPending || balanceMut.isPending}
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

      <AmountVisibilityDialog
        open={visibilityTarget !== null}
        onOpenChange={(open) => {
          if (!open) setVisibilityTarget(null);
        }}
        onSubmit={(code) => {
          if (visibilityTarget) verifySecretMut.mutate({ code, target: visibilityTarget });
        }}
        submitting={verifySecretMut.isPending || balanceMut.isPending}
      />
    </div>
  );
}
