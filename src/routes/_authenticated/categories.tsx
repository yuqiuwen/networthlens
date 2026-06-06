import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  MoreHorizontal,
  Loader2,
  Tags,
  ChevronRight,
  ChevronDown,
  CornerDownRight,
} from "lucide-react";

import { ApiError } from "@/lib/api";
import {
  categoryApi,
  type CategoryItem,
  type CreateCategoryPayload,
  type UpdateCategoryPayload,
} from "@/lib/api/category";
import { CategoryType, CategoryTypeOptions } from "@/lib/constant";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
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

export const Route = createFileRoute("/_authenticated/categories")({
  head: () => ({ meta: [{ title: "分类管理 · NetWorthLens" }] }),
  component: CategoriesPage,
});

// ---------------- 颜色预设 ----------------

const COLOR_PRESETS = [
  "#ef4444",
  "#f97316",
  "#f59e0b",
  "#10b981",
  "#14b8a6",
  "#0ea5e9",
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#64748b",
];

// ---------------- 表单 ----------------

interface FormState {
  category_type: CategoryType;
  parent_id: string;
  name: string;
  icon: string;
  color: string;
  sort_no: string;
}

const emptyForm = (type: CategoryType): FormState => ({
  category_type: type,
  parent_id: "",
  name: "",
  icon: "",
  color: "",
  sort_no: "",
});

function CategoryFormDialog({
  open,
  onOpenChange,
  editing,
  defaultType,
  defaultParentId,
  parentOptions,
  submitting,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: CategoryItem | null;
  defaultType: CategoryType;
  defaultParentId?: string | null;
  parentOptions: CategoryItem[];
  submitting: boolean;
  onSubmit: (form: FormState) => void;
}) {
  const [form, setForm] = useState<FormState>(() => emptyForm(defaultType));

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setForm({
        category_type: editing.category_type,
        parent_id: editing.parent_id ?? "",
        name: editing.name,
        icon: editing.icon ?? "",
        color: editing.color ?? "",
        sort_no: String(editing.sort_no ?? ""),
      });
    } else {
      setForm({
        ...emptyForm(defaultType),
        parent_id: defaultParentId ?? "",
      });
    }
  }, [open, editing, defaultType, defaultParentId]);

  const isEdit = !!editing;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "编辑分类" : "新增分类"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "更新分类信息。" : "添加新的收入、支出或资产分类。"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid gap-2">
            <Label>分类类型</Label>
            <Select
              value={String(form.category_type)}
              disabled={isEdit}
              onValueChange={(v) =>
                setForm((f) => ({
                  ...f,
                  category_type: Number(v) as CategoryType,
                  parent_id: "",
                }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CategoryTypeOptions.map((t) => (
                  <SelectItem key={t.value} value={String(t.value)}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>父级分类</Label>
            <Select
              value={form.parent_id || "__root__"}
              onValueChange={(v) =>
                setForm((f) => ({ ...f, parent_id: v === "__root__" ? "" : v }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="无（顶级分类）" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__root__">无（顶级分类）</SelectItem>
                {parentOptions
                  .filter(
                    (c) =>
                      c.category_type === form.category_type &&
                      !c.parent_id &&
                      c.id !== editing?.id,
                  )
                  .map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="cat-name">名称</Label>
            <Input
              id="cat-name"
              placeholder="如：餐饮、工资"
              maxLength={50}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="cat-icon">图标</Label>
              <Input
                id="cat-icon"
                placeholder="emoji，如 🍔"
                value={form.icon}
                onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))}
              />
            </div>
            {isEdit && (
              <div className="grid gap-2">
                <Label htmlFor="cat-sort">排序</Label>
                <Input
                  id="cat-sort"
                  type="number"
                  inputMode="numeric"
                  value={form.sort_no}
                  onChange={(e) => setForm((f) => ({ ...f, sort_no: e.target.value }))}
                />
              </div>
            )}
          </div>

          <div className="grid gap-2">
            <Label>颜色</Label>
            <div className="flex flex-wrap items-center gap-2">
              {COLOR_PRESETS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, color: c }))}
                  className={cn(
                    "h-7 w-7 rounded-full border-2 transition-all",
                    form.color === c ? "border-foreground scale-110" : "border-transparent",
                  )}
                  style={{ backgroundColor: c }}
                  aria-label={c}
                />
              ))}
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, color: "" }))}
                className={cn(
                  "h-7 px-2 text-xs rounded-md border",
                  !form.color ? "border-foreground" : "border-border text-muted-foreground",
                )}
              >
                无
              </button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            取消
          </Button>
          <Button
            onClick={() => {
              if (!form.name.trim()) {
                toast.error("请输入分类名称");
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

function CategoriesPage() {
  const queryClient = useQueryClient();
  const [activeType, setActiveType] = useState<CategoryType>(CategoryType.EXPENSE);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CategoryItem | null>(null);
  const [defaultParentId, setDefaultParentId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<CategoryItem | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["categories", activeType],
    queryFn: () => categoryApi.list({ category_type: activeType }),
  });

  const list = data ?? [];

  const { roots, childrenMap } = useMemo(() => {
    const sorted = [...list].sort(
      (a, b) => (a.sort_no ?? 0) - (b.sort_no ?? 0) || a.name.localeCompare(b.name),
    );
    const roots = sorted.filter((c) => !c.parent_id);
    const childrenMap: Record<string, CategoryItem[]> = {};
    sorted.forEach((c) => {
      if (c.parent_id) {
        (childrenMap[c.parent_id] ??= []).push(c);
      }
    });
    return { roots, childrenMap };
  }, [list]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["categories"] });

  const createMut = useMutation({
    mutationFn: (payload: CreateCategoryPayload) => categoryApi.create(payload),
    onSuccess: () => {
      toast.success("分类已创建");
      setFormOpen(false);
      invalidate();
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "创建失败"),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateCategoryPayload }) =>
      categoryApi.update(id, payload),
    onSuccess: () => {
      toast.success("已保存");
      setFormOpen(false);
      setEditing(null);
      invalidate();
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "保存失败"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => categoryApi.remove(id),
    onSuccess: () => {
      toast.success("分类已删除");
      setDeleting(null);
      invalidate();
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "删除失败"),
  });

  const handleSubmit = (form: FormState) => {
    const name = form.name.trim();
    if (editing) {
      const payload: UpdateCategoryPayload = {
        name,
        parent_id: form.parent_id || null,
        icon: form.icon || null,
        color: form.color || null,
      };
      const sort = Number(form.sort_no);
      if (!Number.isNaN(sort) && form.sort_no !== "") payload.sort_no = sort;
      updateMut.mutate({ id: editing.id, payload });
    } else {
      const payload: CreateCategoryPayload = {
        category_type: form.category_type,
        name,
        parent_id: form.parent_id || null,
        icon: form.icon || null,
        color: form.color || null,
      };
      createMut.mutate(payload);
    }
  };

  const openCreate = (parentId?: string | null) => {
    setEditing(null);
    setDefaultParentId(parentId ?? null);
    setFormOpen(true);
  };
  const openEdit = (c: CategoryItem) => {
    setEditing(c);
    setDefaultParentId(null);
    setFormOpen(true);
  };

  const submitting = createMut.isPending || updateMut.isPending;

  const renderItem = (item: CategoryItem, isChild = false) => {
    const children = childrenMap[item.id] ?? [];
    const open = expanded[item.id] ?? true;
    return (
      <div key={item.id}>
        <div
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/60 group",
            isChild && "ml-7",
          )}
        >
          {!isChild && children.length > 0 ? (
            <button
              onClick={() => setExpanded((m) => ({ ...m, [item.id]: !open }))}
              className="text-muted-foreground hover:text-foreground"
              aria-label="展开/收起"
            >
              {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          ) : isChild ? (
            <CornerDownRight className="h-3.5 w-3.5 text-muted-foreground/60" />
          ) : (
            <span className="w-4" />
          )}

          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-sm"
            style={{
              backgroundColor: item.color ? `${item.color}22` : "var(--muted)",
              color: item.color ?? "var(--muted-foreground)",
            }}
          >
            {item.icon || item.name.slice(0, 1)}
          </div>

          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium truncate">{item.name}</div>
            {!isChild && children.length > 0 && (
              <div className="text-xs text-muted-foreground">{children.length} 个子分类</div>
            )}
          </div>

          {!isChild && (
            <Button
              size="sm"
              variant="ghost"
              className="opacity-0 group-hover:opacity-100"
              onClick={() => openCreate(item.id)}
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              子分类
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => openEdit(item)}>
                <Pencil className="h-4 w-4 mr-2" />
                编辑
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => setDeleting(item)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                删除
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {!isChild && open && children.length > 0 && (
          <div className="space-y-0.5 pb-1">
            {children.map((c) => renderItem(c, true))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold">分类管理</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            管理收入、支出、资产、负债等分类，可设置子分类。
          </p>
        </div>
        <Button onClick={() => openCreate(null)}>
          <Plus className="mr-2 h-4 w-4" />
          新增分类
        </Button>
      </div>

      <Tabs value={String(activeType)} onValueChange={(v) => setActiveType(Number(v) as CategoryType)}>
        <TabsList>
          {CategoryTypeOptions.map((t) => (
            <TabsTrigger key={t.value} value={String(t.value)}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <Card>
        <CardContent className="p-3">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : isError ? (
            <div className="p-6 text-sm text-destructive">
              加载失败：{(error as Error)?.message ?? "未知错误"}
            </div>
          ) : roots.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <Tags className="h-10 w-10 text-muted-foreground" />
              <div className="text-sm text-muted-foreground">
                还没有「{CategoryTypeMap[activeType]?.label}」分类
              </div>
              <Button variant="outline" onClick={() => openCreate(null)}>
                <Plus className="mr-2 h-4 w-4" />
                新增分类
              </Button>
            </div>
          ) : (
            <div className="space-y-0.5">{roots.map((r) => renderItem(r))}</div>
          )}
        </CardContent>
      </Card>

      <CategoryFormDialog
        open={formOpen}
        onOpenChange={(v) => {
          setFormOpen(v);
          if (!v) {
            setEditing(null);
            setDefaultParentId(null);
          }
        }}
        editing={editing}
        defaultType={activeType}
        defaultParentId={defaultParentId}
        parentOptions={list}
        submitting={submitting}
        onSubmit={handleSubmit}
      />

      <AlertDialog open={!!deleting} onOpenChange={(v) => !v && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除分类</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除「{deleting?.name}」吗？该操作不可恢复。
              {deleting && (childrenMap[deleting.id]?.length ?? 0) > 0 && (
                <span className="mt-2 block text-destructive">
                  注意：该分类下还有 {childrenMap[deleting.id].length} 个子分类。
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMut.isPending}>取消</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteMut.isPending}
              onClick={() => deleting && deleteMut.mutate(deleting.id)}
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
