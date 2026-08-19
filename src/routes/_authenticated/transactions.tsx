import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  FileSpreadsheet,
  Loader2,
  Plus,
  ReceiptText,
  RefreshCw,
  X,
  Upload,
  WalletCards,
} from "lucide-react";
import type { DateRange } from "react-day-picker";

import { ApiError } from "@/lib/api";
import { accountApi, type AccountListItem } from "@/lib/api/account";
import {
  transactionApi,
  type CreateTransactionPayload,
  type ImportSource,
  type TransactionListItem,
} from "@/lib/api/transaction";
import { categoryApi, type CategoryItem } from "@/lib/api/category";
import {
  CategoryType,
  TransactionChannel,
  TransactionChannelOptions,
  TransactionStatus,
  TransactionType,
} from "@/lib/constant";
import { CategoryTreeSelect } from "@/components/category-tree-select";
import { CategoryTreeMultiSelect } from "@/components/category-tree-multi-select";
import { MultiSelect } from "@/components/multi-select";
import { AccountIcon } from "@/components/account-icon";

import { DatePicker } from "@/components/date-picker";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/transactions")({
  head: () => ({ meta: [{ title: "现金流 · NetWorthLens" }] }),
  component: TransactionsPage,
});

const PAGE_SIZE = 20;
const NONE_VALUE = "__none__";

const padTimePart = (value: number) => String(value).padStart(2, "0");

const localDateKey = (date: Date) =>
  `${date.getFullYear()}-${padTimePart(date.getMonth() + 1)}-${padTimePart(date.getDate())}`;

const today = () => localDateKey(new Date());
const monthStart = () => `${today().slice(0, 7)}-01`;
const nowForInput = () => {
  const date = new Date();
  return `${localDateKey(date)}T${padTimePart(date.getHours())}:${padTimePart(date.getMinutes())}`;
};

const toBackendDateTime = (value: string) => {
  const [date, timePart] = value.split("T");
  if (!date || !timePart) return value;
  const time = timePart.slice(0, 8);
  return `${date}T${time.length === 5 ? `${time}:00` : time}`;
};

const splitDateTime = (value: string) => {
  const [date = "", time = ""] = value.split("T");
  return { date, time };
};

const dateFromKey = (value?: string) => {
  if (!value) return undefined;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return undefined;
  return new Date(year, month - 1, day);
};

const dateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const monthsAgo = (months: number) => {
  const current = new Date();
  const target = new Date(current.getFullYear(), current.getMonth() - months, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(current.getDate(), lastDay));
  return target;
};

const QUICK_DATE_RANGES: { label: string; getRange: () => DateRange }[] = [
  {
    label: "近1周",
    getRange: () => {
      const to = new Date();
      const from = new Date(to);
      from.setDate(from.getDate() - 6);
      return { from, to };
    },
  },
  { label: "近1月", getRange: () => ({ from: monthsAgo(1), to: new Date() }) },
  { label: "近1年", getRange: () => ({ from: monthsAgo(12), to: new Date() }) },
];

const formatDateFilter = (value?: string) => {
  const date = dateFromKey(value);
  if (!date) return "不限日期";
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
};

function DateRangeFilter({
  startDate,
  endDate,
  onChange,
}: {
  startDate?: string;
  endDate?: string;
  onChange: (range?: DateRange) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected =
    startDate || endDate ? { from: dateFromKey(startDate), to: dateFromKey(endDate) } : undefined;
  const rangeLabel = startDate
    ? endDate
      ? `${formatDateFilter(startDate)} - ${formatDateFilter(endDate)}`
      : `${formatDateFilter(startDate)} - 请选择结束日期`
    : endDate
      ? `截至 ${formatDateFilter(endDate)}`
      : "不限日期";

  return (
    <div className="grid gap-2">
      <div className="flex items-center gap-1">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full min-w-0 justify-start text-left font-normal sm:w-[320px] md:w-[340px]",
                !startDate && !endDate && "text-muted-foreground",
              )}
            >
              <CalendarDays className="mr-2 h-4 w-4 shrink-0" />
              <span className="min-w-0 truncate">{rangeLabel}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <div className="flex flex-wrap gap-2 border-b p-3">
              {QUICK_DATE_RANGES.map((quickRange) => (
                <Button
                  key={quickRange.label}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onChange(quickRange.getRange());
                    setOpen(false);
                  }}
                >
                  {quickRange.label}
                </Button>
              ))}
            </div>
            <Calendar
              mode="range"
              selected={selected}
              onSelect={onChange}
              numberOfMonths={2}
              captionLayout="dropdown"
              autoFocus
            />
          </PopoverContent>
        </Popover>
        {(startDate || endDate) && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            aria-label="清空日期范围"
            title="清空日期范围"
            onClick={() => onChange(undefined)}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

const formatAmount = (amount: number, currency = "CNY") => {
  const value = amount / 100;
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

const formatDateTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

type TransactionForm = {
  channel: TransactionChannel;
  transactionType: TransactionType;
  amount: string;
  merchant: string;
  occurredAt: string;
  categoryId: string | null;
  accountId: string;
  note: string;
};

const EMPTY_TRANSACTION_FORM: TransactionForm = {
  channel: TransactionChannel.OTHER,
  transactionType: TransactionType.EXPENSE,
  amount: "",
  merchant: "",
  occurredAt: nowForInput(),
  categoryId: null,
  accountId: "",
  note: "",
};

function TransactionFormDialog({
  open,
  onOpenChange,
  onSubmit,
  submitting,
  accounts,
  categories,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (form: TransactionForm) => void;
  submitting: boolean;
  accounts: AccountListItem[];
  categories: CategoryItem[];
}) {
  const [form, setForm] = useState<TransactionForm>(EMPTY_TRANSACTION_FORM);
  const isIncome = form.transactionType === TransactionType.INCOME;
  const usableCategories = categories.filter(
    (category) =>
      category.category_type === (isIncome ? CategoryType.INCOME : CategoryType.EXPENSE),
  );

  const update = <K extends keyof TransactionForm>(key: K, value: TransactionForm[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) setForm(EMPTY_TRANSACTION_FORM);
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>新增流水</DialogTitle>
          <DialogDescription>记录一笔收入或支出，并关联对应账户。</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="grid gap-2">
              <Label>类型</Label>
              <Select
                value={String(form.transactionType)}
                onValueChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    transactionType: Number(value) as TransactionType,
                    categoryId: null,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={String(TransactionType.EXPENSE)}>支出</SelectItem>
                  <SelectItem value={String(TransactionType.INCOME)}>收入</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>渠道</Label>
              <Select
                value={String(form.channel)}
                onValueChange={(value) => update("channel", Number(value) as TransactionChannel)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择渠道" />
                </SelectTrigger>
                <SelectContent>
                  {TransactionChannelOptions.map((option) => (
                    <SelectItem key={option.value} value={String(option.value)}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="transaction-amount">金额</Label>
              <Input
                id="transaction-amount"
                type="number"
                inputMode="decimal"
                min="0.01"
                step="0.01"
                placeholder="0.00"
                value={form.amount}
                onChange={(event) => update("amount", event.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="transaction-merchant">商户或来源</Label>
            <Input
              id="transaction-merchant"
              placeholder={isIncome ? "如：工资、报销" : "如：超市、餐厅"}
              value={form.merchant}
              onChange={(event) => update("merchant", event.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>账户</Label>
              <Select
                value={form.accountId || NONE_VALUE}
                onValueChange={(value) => update("accountId", value === NONE_VALUE ? "" : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择账户" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_VALUE}>暂不关联</SelectItem>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      <span className="flex items-center gap-2">
                        <AccountIcon svg={account.icon} />
                        <span className="truncate">{account.name}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>发生时间</Label>
              <div className="flex min-w-0 gap-2">
                <DatePicker
                  className="min-w-0 flex-1"
                  value={splitDateTime(form.occurredAt).date}
                  onChange={(date) => {
                    const { time } = splitDateTime(form.occurredAt);
                    update("occurredAt", `${date ?? ""}T${time}`);
                  }}
                  placeholder="选择日期"
                  clearable={false}
                />
                <Input
                  type="time"
                  value={splitDateTime(form.occurredAt).time}
                  onChange={(event) => {
                    const { date } = splitDateTime(form.occurredAt);
                    update("occurredAt", `${date}T${event.target.value}`);
                  }}
                  className="w-[7.5rem] shrink-0"
                  aria-label="发生时间"
                />
              </div>
            </div>
          </div>

          <div className="grid gap-2">
            <Label>分类</Label>
            <CategoryTreeSelect
              categories={usableCategories}
              value={form.categoryId}
              onChange={(value) => update("categoryId", value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="transaction-note">备注</Label>
            <Textarea
              id="transaction-note"
              placeholder="可选"
              value={form.note}
              onChange={(event) => update("note", event.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={submitting}>
            取消
          </Button>
          <Button
            onClick={() => {
              const amount = Number(form.amount);
              if (!Number.isFinite(amount) || amount <= 0) {
                toast.error("请输入大于 0 的金额");
                return;
              }
              onSubmit(form);
            }}
            disabled={submitting}
          >
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            保存流水
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ImportDialog({
  open,
  onOpenChange,
  accounts,
  onImport,
  importing,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: AccountListItem[];
  onImport: (source: ImportSource, file: File, accountId?: string) => void;
  importing: boolean;
}) {
  const [source, setSource] = useState<ImportSource>("wx");
  const [file, setFile] = useState<File | null>(null);
  const [accountId, setAccountId] = useState("");

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setFile(null);
      setAccountId("");
    }
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>导入流水</DialogTitle>
          <DialogDescription>上传支付平台导出的交易明细，重复交易会自动跳过。</DialogDescription>
        </DialogHeader>
        <div className="grid gap-5 py-2">
          <div className="grid gap-2">
            <Label>账单来源</Label>
            <Select value={source} onValueChange={(value) => setSource(value as ImportSource)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="wx">微信支付账单</SelectItem>
                <SelectItem value="alipay">支付宝交易明细</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>关联账户</Label>
            <Select
              value={accountId || NONE_VALUE}
              onValueChange={(value) => setAccountId(value === NONE_VALUE ? "" : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="不关联账户" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_VALUE}>不关联账户</SelectItem>
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    <span className="flex items-center gap-2">
                      <AccountIcon svg={account.icon} />
                      <span className="truncate">{account.name}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>账单文件</Label>
            <label
              htmlFor="transaction-import-file"
              className={cn(
                "flex min-h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed px-5 text-center transition-colors hover:border-primary hover:bg-primary/5",
                file && "border-primary bg-primary/5",
              )}
            >
              <FileSpreadsheet className="h-7 w-7 text-primary" />
              <span className="text-sm font-medium">{file ? file.name : "选择导出的账单文件"}</span>
              <span className="text-xs text-muted-foreground">支持 .xlsx、.xls、.csv</span>
              <Input
                id="transaction-import-file"
                type="file"
                accept=".xlsx,.xls,.csv"
                className="sr-only"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              />
            </label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={importing}>
            取消
          </Button>
          <Button
            onClick={() => {
              if (!file) {
                toast.error("请选择账单文件");
                return;
              }
              onImport(source, file, accountId || undefined);
            }}
            disabled={importing}
          >
            {importing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            开始导入
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TransactionsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageInput, setPageInput] = useState("1");
  const [startDate, setStartDate] = useState<string>(monthStart);
  const [endDate, setEndDate] = useState<string>(today);
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [targetAccountIds, setTargetAccountIds] = useState<string[]>([]);
  const [type, setType] = useState<"all" | TransactionType>("all");
  const [formOpen, setFormOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const query = useMemo(
    () => ({
      page,
      limit: PAGE_SIZE,
      ...(categoryIds.length > 0 ? { category_id: categoryIds } : {}),
      ...(targetAccountIds.length > 0 ? { target_account_id: targetAccountIds } : {}),
      ...(type === "all" ? {} : { transaction_type: type }),
      ...(startDate ? { start_time: `${startDate}T00:00:00` } : {}),
      ...(endDate ? { end_time: `${endDate}T23:59:59` } : {}),
    }),
    [endDate, page, startDate, type, categoryIds, targetAccountIds],
  );

  const transactionsQuery = useQuery({
    queryKey: ["transactions", query],
    queryFn: () => transactionApi.list(query),
  });
  const summaryQuery = useQuery({
    queryKey: [
      "transaction-summary",
      query.transaction_type,
      query.start_time,
      query.end_time,
      categoryIds,
      targetAccountIds,
    ],
    queryFn: () =>
      transactionApi.summary({
        ...(categoryIds.length > 0 ? { category_id: categoryIds } : {}),
        ...(targetAccountIds.length > 0 ? { target_account_id: targetAccountIds } : {}),
        ...(query.transaction_type ? { transaction_type: query.transaction_type } : {}),
        ...(query.start_time ? { start_time: query.start_time } : {}),
        ...(query.end_time ? { end_time: query.end_time } : {}),
      }),
  });

  const accountsQuery = useQuery({ queryKey: ["accounts"], queryFn: accountApi.list });
  const categoriesQuery = useQuery({ queryKey: ["categories"], queryFn: () => categoryApi.list() });
  const transactions = useMemo(
    () => transactionsQuery.data?.items ?? [],
    [transactionsQuery.data?.items],
  );
  const accounts = accountsQuery.data ?? [];
  const categories = categoriesQuery.data ?? [];

  const totals = summaryQuery.data ?? { income: 0, expense: 0, balance: 0 };

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["transactions"] });
    queryClient.invalidateQueries({ queryKey: ["transaction-summary"] });
  };

  const updateDateRange = (range?: DateRange) => {
    const nextStartDate = range?.from ? dateKey(range.from) : undefined;
    const nextEndDate = range?.to ? dateKey(range.to) : undefined;
    if (nextStartDate && nextEndDate && nextStartDate > nextEndDate) {
      toast.error("开始日期不能晚于结束日期");
      return;
    }
    setStartDate(nextStartDate ?? "");
    setEndDate(nextEndDate ?? "");
    setPage(1);
  };

  const createMutation = useMutation({
    mutationFn: (payload: CreateTransactionPayload) => transactionApi.create(payload),
    onSuccess: () => {
      toast.success("流水已保存");
      setFormOpen(false);
      invalidate();
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : "保存流水失败"),
  });

  const importMutation = useMutation({
    mutationFn: ({
      source,
      file,
      accountId,
    }: {
      source: ImportSource;
      file: File;
      accountId?: string;
    }) => transactionApi.import({ source, file, accountId }),
    onSuccess: (result) => {
      const summary = [
        `成功 ${result.success_count} 笔`,
        result.skipped_count ? `跳过 ${result.skipped_count} 笔` : "",
      ]
        .filter(Boolean)
        .join("，");
      toast.success(`导入完成：${summary}`);
      setImportOpen(false);
      setPage(1);
      invalidate();
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : "导入失败"),
  });

  const handleCreate = (form: TransactionForm) => {
    const amount = Math.round(Number(form.amount) * 100);
    createMutation.mutate({
      channel: form.channel,
      transaction_type: form.transactionType,
      amount,
      merchant: form.merchant.trim() || null,
      category_id: form.categoryId,
      source_account_id:
        form.transactionType === TransactionType.EXPENSE ? form.accountId || null : null,
      target_account_id:
        form.transactionType === TransactionType.INCOME ? form.accountId || null : null,
      occurred_at: toBackendDateTime(form.occurredAt),
      note: form.note.trim() || null,
    });
  };

  const totalPages = Math.max(1, Math.ceil((transactionsQuery.data?.total ?? 0) / PAGE_SIZE));

  useEffect(() => {
    setPageInput(String(page));
  }, [page]);

  const goToPage = () => {
    const target = Number(pageInput);
    if (!Number.isInteger(target) || target < 1 || target > totalPages) {
      toast.error(`请输入 1-${totalPages} 之间的页码`);
      return;
    }
    setPage(target);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="font-display text-3xl font-semibold">现金流</h1>
          <p className="mt-1 text-sm text-muted-foreground">记录、导入并回看每一笔收支。</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            导入流水
          </Button>
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            新增流水
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-600">
              <ArrowDownLeft className="h-4 w-4" />
            </span>
            <div>
              <p className="text-xs text-muted-foreground">收入</p>
              <p className="mt-1 font-display text-lg font-semibold">
                {formatAmount(totals.income)}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-rose-500/10 text-rose-600">
              <ArrowUpRight className="h-4 w-4" />
            </span>
            <div>
              <p className="text-xs text-muted-foreground">支出</p>
              <p className="mt-1 font-display text-lg font-semibold">
                {formatAmount(totals.expense)}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
              <WalletCards className="h-4 w-4" />
            </span>
            <div>
              <p className="text-xs text-muted-foreground">结余</p>
              <p className="mt-1 font-display text-lg font-semibold">
                {formatAmount(totals.balance)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-4 p-4 lg:flex-row lg:items-end">
          <DateRangeFilter startDate={startDate} endDate={endDate} onChange={updateDateRange} />
          <div className="flex rounded-md border p-1" role="group" aria-label="流水类型筛选">
            {(
              [
                ["all", "全部"],
                [TransactionType.EXPENSE, "支出"],
                [TransactionType.INCOME, "收入"],
              ] as const
            ).map(([value, label]) => (
              <Button
                key={String(value)}
                size="sm"
                variant={type === value ? "secondary" : "ghost"}
                onClick={() => {
                  setType(value);
                  setPage(1);
                }}
              >
                {label}
              </Button>
            ))}
          </div>
          <div className="flex flex-col gap-1.5 lg:w-56">
            <Label className="text-xs text-muted-foreground">分类</Label>
            <CategoryTreeMultiSelect
              categories={categories}
              value={categoryIds}
              onChange={(next) => {
                setCategoryIds(next);
                setPage(1);
              }}
            />
          </div>
          <div className="flex flex-col gap-1.5 lg:w-56">
            <Label className="text-xs text-muted-foreground">目标账户</Label>
            <MultiSelect
              options={accounts.map((item) => ({ value: item.id, label: item.name }))}
              value={targetAccountIds}
              onChange={(next) => {
                setTargetAccountIds(next);
                setPage(1);
              }}
              placeholder="全部账户"
              searchPlaceholder="搜索账户"
              emptyText="暂无账户"
            />
          </div>

          <Button
            type="button"
            variant="outline"
            size="icon"
            className="lg:ml-auto"
            aria-label="刷新流水"
            title="刷新流水"
            onClick={invalidate}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardContent className="p-3 sm:p-4">
          {transactionsQuery.isLoading ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="h-12 w-full" />
              ))}
            </div>
          ) : transactionsQuery.isError ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              加载流水失败，请稍后重试。
            </div>
          ) : transactions.length === 0 ? (
            <div className="flex flex-col items-center gap-3 p-12 text-center">
              <ReceiptText className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="font-medium">暂无流水</p>
                <p className="mt-1 text-sm text-muted-foreground">新增一笔记录，或导入已有账单。</p>
              </div>
              <Button size="sm" onClick={() => setFormOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                新增流水
              </Button>
            </div>
          ) : (
            <>
              <div className="hidden max-h-[min(62vh,620px)] max-w-full overflow-auto rounded-md border pr-3 [scrollbar-gutter:stable] md:block">
                <Table wrapperClassName="overflow-visible" className="min-w-[980px]">
                  <TableHeader className="sticky top-0 z-20 bg-background/95 backdrop-blur [&_th]:bg-background/95">
                    <TableRow>
                      <TableHead>交易时间</TableHead>
                      <TableHead>商户</TableHead>
                      <TableHead>商品</TableHead>
                      <TableHead>类型</TableHead>
                      <TableHead>类别</TableHead>
                      <TableHead>账户</TableHead>
                      <TableHead>备注</TableHead>
                      <TableHead className="text-right">金额</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((item) => (
                      <TransactionRow
                        key={item.id}
                        item={item}
                        accounts={accounts}
                        categories={categories}
                      />
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="divide-y md:hidden">
                {transactions.map((item) => (
                  <TransactionMobileCard key={item.id} item={item} accounts={accounts} />
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {(transactionsQuery.data?.total ?? 0) > PAGE_SIZE && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">共 {transactionsQuery.data?.total} 笔</p>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="transaction-page-jump" className="sr-only">
                跳转页码
              </Label>
              <Input
                id="transaction-page-jump"
                value={pageInput}
                onChange={(event) => setPageInput(event.target.value.replace(/\D/g, ""))}
                onKeyDown={(event) => {
                  if (event.key === "Enter") goToPage();
                }}
                inputMode="numeric"
                className="h-9 w-16 text-center"
                aria-label="跳转页码"
              />
              <span className="text-sm text-muted-foreground">/ {totalPages}</span>
              <Button variant="outline" size="sm" onClick={goToPage}>
                跳转
              </Button>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setPage((current) => current - 1)}
              disabled={page <= 1}
              aria-label="上一页"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-16 text-center text-sm">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setPage((current) => current + 1)}
              disabled={page >= totalPages}
              aria-label="下一页"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setPage(totalPages)}
              disabled={page >= totalPages}
              aria-label="最后一页"
              title="最后一页"
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <TransactionFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleCreate}
        submitting={createMutation.isPending}
        accounts={accounts}
        categories={categories}
      />
      <ImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        accounts={accounts}
        onImport={(source, file, accountId) => importMutation.mutate({ source, file, accountId })}
        importing={importMutation.isPending}
      />
    </div>
  );
}

function TransactionRow({
  item,
  accounts,
}: {
  item: TransactionListItem;
  accounts: AccountListItem[];
}) {
  const income = item.transaction_type === TransactionType.INCOME;
  const accountId = income ? item.target_account_id : item.source_account_id;
  const accountName = accounts.find((account) => account.id === accountId)?.name ?? "未关联账户";
  const typeLabel = income
    ? "收入"
    : item.transaction_type === TransactionType.EXPENSE
      ? "支出"
      : "其他";
  return (
    <TableRow>
      <TableCell className="whitespace-nowrap text-muted-foreground">
        {formatDateTime(item.occurred_at)}
      </TableCell>
      <TableCell className="max-w-[180px] truncate" title={item.merchant ?? undefined}>
        {item.merchant || "未填写"}
      </TableCell>
      <TableCell className="max-w-[180px] truncate" title={item.product ?? undefined}>
        {item.product || "未填写"}
      </TableCell>
      <TableCell>
        <span
          className={cn(
            "inline-flex rounded-full px-2 py-0.5 text-xs",
            income ? "bg-emerald-500/10 text-emerald-700" : "bg-rose-500/10 text-rose-700",
          )}
        >
          {item.status === TransactionStatus.REFUNDED ? "已退款" : typeLabel}
        </span>
      </TableCell>
      <TableCell className="text-muted-foreground">{accountName}</TableCell>
      <TableCell
        className="max-w-[240px] truncate text-muted-foreground"
        title={item.note ?? undefined}
      >
        {item.note || "—"}
      </TableCell>
      <TableCell
        className={cn("text-right font-medium", income ? "text-emerald-700" : "text-foreground")}
      >
        {income ? "+" : "-"}
        {formatAmount(item.amount, item.currency)}
      </TableCell>
    </TableRow>
  );
}

function TransactionMobileCard({
  item,
  accounts,
}: {
  item: TransactionListItem;
  accounts: AccountListItem[];
}) {
  const income = item.transaction_type === TransactionType.INCOME;
  const accountId = income ? item.target_account_id : item.source_account_id;
  const accountName = accounts.find((account) => account.id === accountId)?.name ?? "未关联账户";
  return (
    <div className="flex items-center gap-3 p-4">
      <span
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-md",
          income ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600",
        )}
      >
        {income ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{item.merchant || "未填写商户"}</p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          商品：{item.product || "未填写"}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {formatDateTime(item.occurred_at)} · {accountName}
        </p>
        {item.note && (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">备注：{item.note}</p>
        )}
      </div>
      <p className={cn("shrink-0 text-sm font-semibold", income && "text-emerald-700")}>
        {income ? "+" : "-"}
        {formatAmount(item.amount, item.currency)}
      </p>
    </div>
  );
}
