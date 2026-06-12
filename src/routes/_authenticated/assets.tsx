import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  TrendingUp,
  Loader2,
  Wallet,
} from "lucide-react";

import { ApiError } from "@/lib/api";
import {
  assetApi,
  type AssetListItem,
  type AssetDetail,
  type CreateAssetPayload,
  type UpdateAssetPayload,
  type CreateValuationPayload,
  type PageResp,
} from "@/lib/api/asset";
import { categoryApi, type CategoryItem } from "@/lib/api/category";
import {
  AssetStatus,
  AssetType,
  AssetTypeOptions,
  AssetTypeMap,
  AssetStatusOptions,
  AssetStatusMap,
  AssetValuationMethod,
  AssetValuationMethodOptions,
  AssetValuationSource,
  AssetValuationSourceOptions,
  AssetValuationSourceMap,
  CategoryType,
} from "@/lib/constant";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { CategoryTreeSelect } from "@/components/category-tree-select";

export const Route = createFileRoute("/_authenticated/assets")({
  head: () => ({ meta: [{ title: "资产管理 · NetWorthLens" }] }),
  component: AssetsPage,
});

// ---------------- 工具 ----------------

const CURRENCIES = ["CNY", "USD", "EUR", "JPY", "HKD", "GBP"] as const;

const formatAmount = (cents: number | null | undefined, currency = "CNY") => {
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

const formatDate = (s?: string | null) => {
  if (!s) return "—";
  return s;
};

const todayStr = () => new Date().toISOString().slice(0, 10);

// ---------------- 表单 ----------------

interface FormState {
  asset_type: AssetType;
  name: string;
  currency: string;
  quantity: string;
  unit: string;
  purchase_amount: string; // 元
  current_value: string; // 元
  unit_price: string;
  purchase_date: string;
  valuation_method: AssetValuationMethod;
  status: AssetStatus;
  category_id: string;
  note: string;
}

const EMPTY_FORM: FormState = {
  asset_type: AssetType.OTHER,
  name: "",
  currency: "CNY",
  quantity: "1",
  unit: "",
  purchase_amount: "0",
  current_value: "0",
  unit_price: "",
  purchase_date: "",
  valuation_method: AssetValuationMethod.MANUAL,
  status: AssetStatus.NORMAL,
  category_id: "",
  note: "",
};

function AssetFormDialog({
  open,
  onOpenChange,
  editing,
  detail,
  onSubmit,
  submitting,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: AssetListItem | null;
  detail: AssetDetail | null;
  onSubmit: (form: FormState) => void;
  submitting: boolean;
}) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const isEdit = !!editing;

  const { data: categories } = useQuery({
    queryKey: ["categories", "asset"],
    queryFn: () => categoryApi.list({ category_type: CategoryType.ASSET }),
    enabled: open,
  });

  useEffect(() => {
    if (!open) return;
    if (editing && detail) {
      setForm({
        asset_type: detail.asset_type,
        name: detail.name,
        currency: detail.currency,
        quantity: String(detail.quantity ?? 1),
        unit: detail.unit ?? "",
        purchase_amount: ((detail.purchase_amount ?? 0) / 100).toString(),
        current_value: ((detail.current_value ?? 0) / 100).toString(),
        unit_price: detail.unit_price != null ? String(detail.unit_price) : "",
        purchase_date: detail.purchase_date ?? "",
        valuation_method: detail.valuation_method ?? AssetValuationMethod.MANUAL,
        status: detail.status ?? AssetStatus.NORMAL,
        category_id: detail.category_id ?? "",
        note: detail.note ?? "",
      });
    } else if (editing) {
      // 详情未到，先用列表信息占位
      setForm((f) => ({
        ...EMPTY_FORM,
        asset_type: editing.asset_type,
        name: editing.name,
        currency: editing.currency,
        current_value: ((editing.current_value ?? 0) / 100).toString(),
        status: editing.status,
      }));
    } else {
      setForm(EMPTY_FORM);
    }
  }, [open, editing, detail]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "编辑资产" : "新增资产"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "更新资产信息与当前估值。" : "录入一项新的资产并设置初始估值。"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>资产类型</Label>
              <Select
                value={String(form.asset_type)}
                disabled={isEdit}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, asset_type: Number(v) as AssetType }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AssetTypeOptions.map((t) => (
                    <SelectItem key={t.value} value={String(t.value)}>
                      <span className="mr-1">{t.icon}</span>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
          </div>

          <div className="grid gap-2">
            <Label htmlFor="asset-name">资产名称</Label>
            <Input
              id="asset-name"
              placeholder="如：劳力士手表、贵州茅台"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="quantity">数量</Label>
              <Input
                id="quantity"
                type="number"
                step="any"
                inputMode="decimal"
                value={form.quantity}
                onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="unit">单位</Label>
              <Input
                id="unit"
                placeholder="只/股/㎡"
                value={form.unit}
                onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="unit-price">单价（可选）</Label>
              <Input
                id="unit-price"
                type="number"
                step="any"
                inputMode="decimal"
                value={form.unit_price}
                onChange={(e) => setForm((f) => ({ ...f, unit_price: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="purchase-amount">购入金额</Label>
              <Input
                id="purchase-amount"
                type="number"
                step="0.01"
                inputMode="decimal"
                value={form.purchase_amount}
                onChange={(e) =>
                  setForm((f) => ({ ...f, purchase_amount: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="current">当前价值</Label>
              <Input
                id="current"
                type="number"
                step="0.01"
                inputMode="decimal"
                value={form.current_value}
                onChange={(e) =>
                  setForm((f) => ({ ...f, current_value: e.target.value }))
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="purchase">购入日期</Label>
              <Input
                id="purchase"
                type="date"
                value={form.purchase_date}
                onChange={(e) =>
                  setForm((f) => ({ ...f, purchase_date: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label>估值方式</Label>
              <Select
                value={String(form.valuation_method)}
                onValueChange={(v) =>
                  setForm((f) => ({
                    ...f,
                    valuation_method: Number(v) as AssetValuationMethod,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AssetValuationMethodOptions.map((m) => (
                    <SelectItem key={m.value} value={String(m.value)}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {isEdit && (
            <div className="grid gap-2">
              <Label>状态</Label>
              <Select
                value={String(form.status)}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, status: Number(v) as AssetStatus }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AssetStatusOptions.map((s) => (
                    <SelectItem key={s.value} value={String(s.value)}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid gap-2">
            <Label>分类</Label>
            <CategoryTreeSelect
              categories={categories ?? []}
              value={form.category_id || null}
              onChange={(v) =>
                setForm((f) => ({
                  ...f,
                  category_id: v ?? "",
                }))
              }
              placeholder="选择分类（可选）"
              allowClear
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="note">备注</Label>
            <Textarea
              id="note"
              rows={2}
              placeholder="选填"
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            取消
          </Button>
          <Button
            onClick={() => {
              if (!form.name.trim()) {
                toast.error("请输入资产名称");
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

// ---------------- 估值调整 Dialog ----------------

function ValuationDialog({
  open,
  onOpenChange,
  asset,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  asset: AssetListItem | null;
}) {
  const queryClient = useQueryClient();
  const [value, setValue] = useState("");
  const [date, setDate] = useState(todayStr());
  const [source, setSource] = useState<AssetValuationSource>(AssetValuationSource.MANUAL);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (open && asset) {
      setValue((asset.current_value / 100).toString());
      setDate(todayStr());
      setSource(AssetValuationSource.MANUAL);
      setNote("");
    }
  }, [open, asset]);

  const { data: history, isLoading } = useQuery({
    queryKey: ["asset", asset?.id, "valuations"],
    queryFn: () => assetApi.listValuations(asset!.id),
    enabled: !!asset && open,
  });

  const mut = useMutation({
    mutationFn: (payload: CreateValuationPayload) =>
      assetApi.addValuation(asset!.id, payload),
    onSuccess: () => {
      toast.success("估值已更新");
      queryClient.invalidateQueries({ queryKey: ["asset", asset?.id, "valuations"] });
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      setNote("");
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "提交失败"),
  });

  if (!asset) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>调整估值 · {asset.name}</DialogTitle>
          <DialogDescription>记录一次新的估值，便于追踪历史曲线。</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="grid gap-2">
            <Label>新估值（{asset.currency}）</Label>
            <Input
              type="number"
              step="0.01"
              inputMode="decimal"
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>估值日期</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label>来源</Label>
              <Select
                value={String(source)}
                onValueChange={(v) => setSource(Number(v) as AssetValuationSource)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AssetValuationSourceOptions.map((s) => (
                    <SelectItem key={s.value} value={String(s.value)}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-2">
            <Label>备注</Label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="选填" />
          </div>
          <Button
            className="w-full"
            disabled={mut.isPending}
            onClick={() => {
              const cents = Math.round(Number(value || 0) * 100);
              if (!Number.isFinite(cents)) {
                toast.error("请输入有效数值");
                return;
              }
              if (!date) {
                toast.error("请选择估值日期");
                return;
              }
              mut.mutate({
                valuation: cents,
                valuation_date: date,
                source,
                note: note || undefined,
              });
            }}
          >
            {mut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            提交估值
          </Button>
        </div>

        <div className="border-t pt-3">
          <div className="mb-2 text-xs font-medium text-muted-foreground">历史估值</div>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : !history || history.length === 0 ? (
            <div className="py-6 text-center text-xs text-muted-foreground">暂无历史记录</div>
          ) : (
            <div className="max-h-48 overflow-y-auto space-y-1.5 text-sm">
              {history.map((v) => {
                const src = AssetValuationSourceMap[v.source];
                return (
                  <div
                    key={v.id}
                    className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2"
                  >
                    <div>
                      <div className="font-medium">
                        {formatAmount(v.valuation, asset.currency)}
                      </div>
                      {v.note && (
                        <div className="text-xs text-muted-foreground">{v.note}</div>
                      )}
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      <div>{formatDate(v.valuation_date)}</div>
                      {src && <div>{src.label}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---------------- 页面 ----------------

function AssetsPage() {
  const queryClient = useQueryClient();
  const [typeFilter, setTypeFilter] = useState<"all" | AssetType>("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AssetListItem | null>(null);
  const [detail, setDetail] = useState<AssetDetail | null>(null);
  const [deleting, setDeleting] = useState<AssetListItem | null>(null);
  const [valuationFor, setValuationFor] = useState<AssetListItem | null>(null);

  const queryPayload = typeFilter === "all" ? {} : { asset_type: typeFilter };

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["assets", typeFilter],
    queryFn: () => assetApi.list(queryPayload),
  });

  const assets: AssetListItem[] = useMemo(() => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    return (data as PageResp<AssetListItem>).items ?? [];
  }, [data]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["assets"] });

  const createMut = useMutation({
    mutationFn: (payload: CreateAssetPayload) => assetApi.create(payload),
    onSuccess: () => {
      toast.success("资产已创建");
      setFormOpen(false);
      invalidate();
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "创建失败"),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateAssetPayload }) =>
      assetApi.update(id, payload),
    onSuccess: () => {
      toast.success("已保存");
      setFormOpen(false);
      setEditing(null);
      setDetail(null);
      invalidate();
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "保存失败"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => assetApi.remove(id),
    onSuccess: () => {
      toast.success("资产已删除");
      setDeleting(null);
      invalidate();
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "删除失败"),
  });

  const handleEdit = async (a: AssetListItem) => {
    setEditing(a);
    setDetail(null);
    setFormOpen(true);
    try {
      const d = await assetApi.get(a.id);
      setDetail(d);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "获取资产详情失败");
    }
  };

  const handleSubmit = (form: FormState) => {
    const purchaseCents = Math.round(Number(form.purchase_amount || 0) * 100);
    const currentCents = Math.round(Number(form.current_value || 0) * 100);
    const quantity = Number(form.quantity || 0);
    const unitPrice = form.unit_price ? Number(form.unit_price) : undefined;
    const categoryId = form.category_id.trim() || null;

    if (editing) {
      const payload: UpdateAssetPayload = {
        name: form.name.trim(),
        quantity,
        purchase_amount: purchaseCents,
        current_value: currentCents,
        valuation_method: form.valuation_method,
        status: form.status,
        category_id: categoryId,
        note: form.note.trim() || null,
      };
      updateMut.mutate({ id: editing.id, payload });
    } else {
      const payload: CreateAssetPayload = {
        asset_type: form.asset_type,
        name: form.name.trim(),
        currency: form.currency,
        quantity,
        unit: form.unit.trim() || null,
        purchase_amount: purchaseCents,
        current_value: currentCents,
        unit_price: unitPrice,
        purchase_date: form.purchase_date || null,
        valuation_method: form.valuation_method,
        category_id: categoryId,
        note: form.note.trim() || null,
      };
      createMut.mutate(payload);
    }
  };

  // 汇总
  const totalsByCurrency = assets.reduce<Record<string, number>>((acc, a) => {
    if (a.status !== AssetStatus.NORMAL) return acc;
    acc[a.currency] = (acc[a.currency] ?? 0) + (a.current_value ?? 0);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold">资产管理</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            管理你的房产、车辆、收藏品、数码、珠宝等各类资产。
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setDetail(null);
            setFormOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          新增资产
        </Button>
      </div>

      {/* 汇总 */}
      {Object.keys(totalsByCurrency).length > 0 && (
        <Card>
          <CardContent className="flex flex-wrap gap-6 p-5">
            {Object.entries(totalsByCurrency).map(([cur, sum]) => (
              <div key={cur} className="flex flex-col">
                <span className="text-xs text-muted-foreground">{cur} 资产合计</span>
                <span className="mt-1 font-display text-2xl font-semibold">
                  {formatAmount(sum, cur)}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* 类型筛选 */}
      <Tabs
        value={String(typeFilter)}
        onValueChange={(v) =>
          setTypeFilter(v === "all" ? "all" : (Number(v) as AssetType))
        }
      >
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="all">全部</TabsTrigger>
          {AssetTypeOptions.map((t) => (
            <TabsTrigger key={t.value} value={String(t.value)}>
              <span className="mr-1">{t.icon}</span>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

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
      ) : assets.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <Wallet className="h-10 w-10 text-muted-foreground" />
            <div className="text-sm text-muted-foreground">还没有资产，先添加一个吧</div>
            <Button
              variant="outline"
              onClick={() => {
                setEditing(null);
                setDetail(null);
                setFormOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              新增资产
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {assets.map((a) => {
            const meta = AssetTypeMap[a.asset_type];
            const status = AssetStatusMap[a.status];
            return (
              <Card key={a.id} className="group relative overflow-hidden">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={cn(
                          "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-lg",
                          meta?.tone,
                        )}
                      >
                        {meta?.icon ?? "📦"}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium truncate">{a.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {meta?.label ?? "未知"} · {a.currency}
                        </div>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setValuationFor(a)}>
                          <TrendingUp className="h-4 w-4 mr-2" />
                          调整估值
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEdit(a)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          编辑
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setDeleting(a)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          删除
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="mt-4">
                    <div className="text-xs text-muted-foreground">当前价值</div>
                    <div className="mt-0.5 font-display text-xl font-semibold">
                      {formatAmount(a.current_value, a.currency)}
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-end text-xs">
                    {status && (
                      <Badge variant="secondary" className={cn("font-normal", status.color)}>
                        {status.label}
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <AssetFormDialog
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
        submitting={createMut.isPending || updateMut.isPending}
      />

      <ValuationDialog
        open={!!valuationFor}
        onOpenChange={(v) => !v && setValuationFor(null)}
        asset={valuationFor}
      />

      <AlertDialog open={!!deleting} onOpenChange={(v) => !v && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确定删除资产？</AlertDialogTitle>
            <AlertDialogDescription>
              删除「{deleting?.name}」后，相关的估值历史也会一同移除，操作不可恢复。
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
