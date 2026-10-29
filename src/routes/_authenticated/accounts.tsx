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
  Landmark,
  TrendingUp,
  MoreHorizontal,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Eye,
  EyeOff,
  RefreshCw,
} from "lucide-react";

import { ApiError } from "@/lib/api";
import {
  accountApi,
  type AccountListItem,
  type AccountDetail,
  type AccountBalance,
  type AccountBalanceSyncResult,
  type CreateAccountPayload,
  type UpdateAccountPayload,
} from "@/lib/api/account";
import { secretApi } from "@/lib/api/secret";
import { AccountStatus, AccountType, AccountTypeOptions } from "@/lib/constant";
import { defineMap } from "@/utils/enum";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
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
  head: () => ({ meta: [{ title: "账户管理 · Finora" }] }),
  component: AccountsPage,
});

// ---------------- 枚举 ----------------

/**
 * 账户类型的**视觉元数据**（图标 / 配色）。
 *
 * 中文名不在这里写 —— label 一律取自 `AccountTypeOptions`（src/lib/constant.ts），
 * 键值严格对齐后端 `app/constant.py::AccountType`。
 *
 * 这里曾经是一份自带的 6 项列表（储蓄卡 / 现金 / 信用卡 / 支付宝 / 微信 / 其他），
 * 编号和后端枚举整体错位：
 *
 *   | 值 | 旧列表显示 | 后端真实含义 |
 *   | 1  | 储蓄卡     | 现金         |
 *   | 2  | 现金       | 银行存款     |
 *   | 3  | 信用卡     | 支付账户     |
 *   | 4  | 支付宝     | 信用卡       |
 *   | 5  | 微信       | 证券账户     |
 *   | 6  | 其他       | 理财账户     |
 *
 * 后果有两个，都很隐蔽：
 *   1. 同一个账户在「账户管理」和「财务概览」显示成两个不同的类型
 *      （概览页走 constant.ts 的映射，是对的）；
 *   2. 用户在账户页选「支付宝」提交的是 4，后端存成「信用卡」；
 *      选「微信」提交 5，存成「证券账户」—— 类型从录入那一刻就是错的。
 *
 * 所以现在只保留图标/配色，label 与取值都从共享枚举来，避免再出现第二份真相。
 */
const ACCOUNT_TYPE_VISUALS: Record<
  AccountType,
  { icon: React.ComponentType<{ className?: string }>; tone: string; surface: string }
> = {
  [AccountType.CASH]: { icon: Banknote, tone: "text-emerald-500", surface: "bg-emerald-500/10" },
  [AccountType.BANK]: { icon: Landmark, tone: "text-sky-500", surface: "bg-sky-500/10" },
  [AccountType.PAYMENT]: { icon: Smartphone, tone: "text-blue-500", surface: "bg-blue-500/10" },
  [AccountType.CREDIT_CARD]: { icon: CreditCard, tone: "text-rose-500", surface: "bg-rose-500/10" },
  [AccountType.SECURITIES]: {
    icon: TrendingUp,
    tone: "text-violet-500",
    surface: "bg-violet-500/10",
  },
  [AccountType.WEALTH]: { icon: PiggyBank, tone: "text-amber-500", surface: "bg-amber-500/10" },
  [AccountType.OTHER]: { icon: Wallet, tone: "text-muted-foreground", surface: "bg-muted" },
};

const ACCOUNT_TYPES = AccountTypeOptions.map((option) => ({
  ...option,
  ...ACCOUNT_TYPE_VISUALS[option.value],
}));

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

/**
 * 「余额多久没对过账」的短文案。
 *
 * 银行 / 微信 / 支付宝都没有余额查询接口，账单导出里也没有余额列，
 * 所以余额只能靠人从三方 App 上看到后录进来。既然没法自动更新，
 * 就至少把「这个数有多旧」如实说出来，而不是假装它是当前的。
 *
 * 从未实测时后端返回的 `balance_updated_at` 字段会被 exclude_none 整个摘掉，
 * 所以这里必须用 `== null` 判断，不能当空串。
 */
function balanceFreshness(measuredAt?: string | null): string {
  if (measuredAt == null) return "余额未实测";
  const at = new Date(measuredAt).getTime();
  if (Number.isNaN(at)) return "余额未实测";
  const days = Math.floor((Date.now() - at) / 86_400_000);
  if (days <= 0) return "余额今天已实测";
  return `余额 ${days} 天前实测`;
}

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
            {isEdit ? "更新账户类型、名称、余额或启用状态。" : "添加银行卡、现金、信用卡等账户。"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid gap-2">
            <Label>账户类型</Label>
            <Select
              value={String(form.account_type)}
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
              {/* 信用额度只有信用卡才有。原先这里写的是 `account_type === 3`，
                  但枚举里 3 是 PAYMENT（支付账户）、CREDIT_CARD 是 4 —— 魔数写错了，
                  导致额度显示在支付账户上、信用卡反而看不到。
                  改成引用枚举，避免以后再对不上号。 */}
              {editing.account_type === AccountType.CREDIT_CARD && detail && (
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

/**
 * 同步余额：把三方 App 上看到的实际余额录进来。
 *
 * 为什么要有这个入口而不是直接用「编辑」：
 * 编辑表单要经历「打开编辑 → 点眼睛 → 输密钥 → 改数字 → 保存」五步，
 * 而余额本来就是人打开银行 App 时会顺便看到的东西，瓶颈全在录入环节。
 * 这里把它压成「金额 + 密钥 + 保存」一屏。
 *
 * 保存后会显示本次对账算出的**未记录缺口**：
 * 缺口 = 本次实测 −（上次实测 + 期间已记录流水净额）。
 * 它不是一个要维护的成本，而是账单完整度的直接读数 ——
 * 填一次余额，顺便就得到了「流水比实际少了多少」。
 */
function SyncBalanceDialog({
  open,
  onOpenChange,
  account,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: AccountListItem | null;
  onSubmit: (payload: { code: string; balance: number }) => Promise<AccountBalanceSyncResult>;
}) {
  const [amount, setAmount] = useState("");
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<AccountBalanceSyncResult | null>(null);

  useEffect(() => {
    if (!open) {
      setAmount("");
      setCode("");
      setSubmitting(false);
      setResult(null);
    }
  }, [open]);

  const currency = account?.currency ?? "CNY";
  const amountCents = Math.round(Number(amount) * 100);
  const amountValid = amount.trim() !== "" && Number.isFinite(amountCents);
  const canSubmit = amountValid && code.length === 6 && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      // 余额是敏感信息（读接口都走查看密钥），写接口沿用同一道门：
      // 先换取加密后的密钥，再连同新余额一起提交。
      const encryptedCode = await secretApi.verify({ code });
      setResult(await onSubmit({ code: encryptedCode, balance: amountCents }));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "同步余额失败");
      setCode("");
    } finally {
      setSubmitting(false);
    }
  };

  const drift = result?.drift ?? 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{result ? "已同步余额" : "同步余额"}</DialogTitle>
          <DialogDescription>
            {result
              ? account?.name
              : `填入「${account?.name ?? ""}」在三方 App 里显示的实际余额，用于对账。`}
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="grid gap-3 py-2 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">本次录入</span>
              <span className="font-display font-semibold tabular-nums">
                {formatAmount(result.balance, currency)}
              </span>
            </div>

            {result.drift_available ? (
              <>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">上次实测</span>
                  <span className="tabular-nums">
                    {formatAmount(result.previous_balance, currency)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">期间已记录流水</span>
                  <span className="tabular-nums">
                    {formatAmount(result.recorded_flow ?? 0, currency)}
                  </span>
                </div>
                <Separator />
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">未记录缺口</span>
                  <span className="font-display font-semibold tabular-nums">
                    {formatAmount(drift, currency)}
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {drift > 0
                    ? "流水少记了这笔钱：按流水推算的余额比实际更低，说明有支出没导进来，或有转入没记。"
                    : drift < 0
                      ? "流水多记了这笔钱：按流水推算的余额比实际更高，说明有收入没导进来，或有转出没记。"
                      : "流水与实测完全对上，这段时间的账单是完整的。"}
                </p>
              </>
            ) : (
              <p className="text-xs leading-relaxed text-muted-foreground">
                这是该账户的第一次实测，已作为基准。下次同步时就能算出这段时间的未记录缺口。
              </p>
            )}
          </div>
        ) : (
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="sync-balance-amount">实际余额（{currency}）</Label>
              <Input
                id="sync-balance-amount"
                type="number"
                step="0.01"
                inputMode="decimal"
                placeholder="0.00"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                disabled={submitting}
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                银行、微信、支付宝都没有余额查询接口，这个数只能手动录。
                录入后会记录实测时间，并算出这段时间账单漏了多少。
              </p>
            </div>

            <div className="grid gap-2">
              <Label>查看密钥</Label>
              <div className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={code}
                  onChange={setCode}
                  pattern={REGEXP_ONLY_DIGITS}
                  type="password"
                  inputMode="numeric"
                  disabled={submitting}
                  aria-label="6 位数字查看密钥"
                >
                  <InputOTPGroup>
                    {Array.from({ length: 6 }, (_, index) => (
                      <InputOTPSlot key={index} index={index} />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          {result ? (
            <Button onClick={() => onOpenChange(false)}>完成</Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
                取消
              </Button>
              <Button onClick={handleSubmit} disabled={!canSubmit}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                保存
              </Button>
            </>
          )}
        </DialogFooter>
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
  const [syncTarget, setSyncTarget] = useState<AccountListItem | null>(null);

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
    // 账户余额是仪表盘「总资产 / 资金账户」的输入，改完必须一起失效，
    // 否则切回仪表盘还是旧数字（以前只失效 ["accounts"]，这里补上）。
    queryClient.invalidateQueries({ queryKey: ["stats"] });
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

  // 同步余额。故意不在这里写 onError：错误要冒泡回对话框，
  // 由它把提示和「重新输入密钥」一起处理，避免弹两次 toast。
  const syncMut = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: { code: string; balance: number } }) =>
      accountApi.syncBalance(id, payload),
    onSuccess: () => invalidate(),
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

  const requestSync = (account: AccountListItem) => {
    if (secretStatusQuery.isLoading) {
      toast.info("正在检查查看密钥状态");
      return;
    }
    if (!secretStatusQuery.data?.configured) {
      toast.error("请先在个人中心设置 6 位数字查看密钥");
      return;
    }
    setSyncTarget(account);
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
        account_type: form.account_type,
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
                        <DropdownMenuItem onClick={() => requestSync(acc)}>
                          <RefreshCw className="mr-2 h-4 w-4" />
                          同步余额
                        </DropdownMenuItem>
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
                        <div
                          className="truncate text-xs text-muted-foreground"
                          title="三方渠道都没有余额查询接口，余额只能手动同步。这里显示上次实测距今多久。"
                        >
                          {meta.label} · {acc.currency} · {balanceFreshness(acc.balance_updated_at)}
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

      <SyncBalanceDialog
        open={syncTarget !== null}
        onOpenChange={(open) => {
          if (!open) setSyncTarget(null);
        }}
        account={syncTarget}
        onSubmit={async ({ code, balance }) => {
          if (!syncTarget) throw new Error("未选择账户");
          return syncMut.mutateAsync({ id: syncTarget.id, payload: { code, balance } });
        }}
      />
    </div>
  );
}
