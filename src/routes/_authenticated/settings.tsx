import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  categoryWordApi,
  type CreateTransCategoryWordPayload,
  type TransCategoryWordItem,
} from "@/lib/api/category-word";
import { categoryApi } from "@/lib/api/category";
import { CategoryTreeSelect } from "@/components/category-tree-select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "系统设置 — NetWorthLens" },
      { name: "description", content: "管理交易类别匹配词等系统设置。" },
      { property: "og:title", content: "系统设置 — NetWorthLens" },
      { property: "og:description", content: "管理交易类别匹配词等系统设置。" },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">系统设置</h1>
        <p className="text-sm text-muted-foreground mt-1">配置系统级规则与偏好</p>
      </div>
      <Tabs defaultValue="category_word">
        <TabsList>
          <TabsTrigger value="category_word">交易类别匹配词</TabsTrigger>
        </TabsList>
        <TabsContent value="category_word" className="mt-4">
          <CategoryWordPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

const QK = ["category-words"];

function CategoryWordPanel() {
  const qc = useQueryClient();
  const [keyword, setKeyword] = useState("");
  const [selected, setSelected] = useState<number[]>([]);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [word, setWord] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);

  const q = useQuery({ queryKey: QK, queryFn: categoryWordApi.list });
  const catQ = useQuery({ queryKey: ["categories", "all"], queryFn: () => categoryApi.list() });

  const rows = useMemo(() => {
    const k = keyword.trim().toLowerCase();
    const list = q.data ?? [];
    return k ? list.filter((r) => (r.words ?? []).some((w) => w.toLowerCase().includes(k))) : list;
  }, [q.data, keyword]);

  const openCreate = () => {
    setEditingId(null);
    setWord("");
    setCategoryId(null);
    setOpen(true);
  };

  const openEdit = (r: TransCategoryWordItem) => {
    setEditingId(r.id);
    setWord((r.words ?? []).join(","));
    setCategoryId(r.category?.id ?? null);
    setOpen(true);
  };

  const saveM = useMutation({
    mutationFn: (payload: CreateTransCategoryWordPayload) =>
      editingId != null
        ? categoryWordApi.update(editingId, payload)
        : categoryWordApi.create(payload),
    onSuccess: () => {
      toast.success(editingId != null ? "匹配词已更新" : "匹配词已添加");
      setOpen(false);
      setEditingId(null);
      setWord("");
      setCategoryId(null);
      qc.invalidateQueries({ queryKey: QK });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeM = useMutation({
    mutationFn: categoryWordApi.remove,
    onSuccess: () => {
      toast.success("已删除");
      setSelected([]);
      qc.invalidateQueries({ queryKey: QK });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const submit = () => {
    const words = Array.from(
      new Set(word.split(/[,，]/).map((w) => w.trim()).filter(Boolean)),
    );
    if (!categoryId) return toast.error("请选择分类");
    if (!words.length) return toast.error("请输入匹配词");
    if (words.length > 100) return toast.error("单次最多 100 个匹配词");
    saveM.mutate({ category_id: categoryId, words });
  };

  const allChecked = rows.length > 0 && rows.every((r) => selected.includes(r.id));
  const toggleAll = () =>
    setSelected(allChecked ? [] : rows.map((r) => r.id));
  const toggle = (id: number) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  return (
    <Card className="p-4 space-y-4">
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索匹配词"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="pl-8"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            disabled={!selected.length || removeM.isPending}
            onClick={() => {
              if (confirm(`确定删除选中的 ${selected.length} 个匹配词？`)) removeM.mutate(selected);
            }}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            批量删除{selected.length ? ` (${selected.length})` : ""}
          </Button>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" />
            新增匹配词
          </Button>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">
              <Checkbox checked={allChecked} onCheckedChange={toggleAll} />
            </TableHead>
            <TableHead className="w-48">分类</TableHead>
            <TableHead>匹配词</TableHead>
            <TableHead className="w-24 text-right">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {q.isLoading ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                加载中…
              </TableCell>
            </TableRow>
          ) : rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                暂无匹配词
              </TableCell>
            </TableRow>
          ) : (
            rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  <Checkbox checked={selected.includes(r.id)} onCheckedChange={() => toggle(r.id)} />
                </TableCell>
                <TableCell>
                  <span className="inline-flex items-center gap-1.5 font-medium">
                    {r.category?.icon && <span>{r.category.icon}</span>}
                    <span style={r.category?.color ? { color: r.category.color } : undefined}>
                      {r.category?.name ?? "-"}
                    </span>
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {(r.words ?? []).map((w) => (
                      <Badge key={w} variant="secondary">{w}</Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="text-right whitespace-nowrap">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    aria-label="编辑"
                    onClick={() => openEdit(r)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => {
                      if (confirm(`确定删除「${r.category?.name ?? ""}」的匹配词？`)) removeM.mutate([r.id]);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId != null ? "编辑匹配词" : "新增匹配词"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>分类</Label>
              <CategoryTreeSelect
                categories={catQ.data ?? []}
                value={categoryId}
                onChange={setCategoryId}
                placeholder="选择分类"
              />
            </div>
            <div className="space-y-2">
              <Label>匹配词</Label>
              <Textarea
                value={word}
                rows={4}
                onChange={(e) => setWord(e.target.value)}
                placeholder="多个以逗号隔开，最多 100 个"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              取消
            </Button>
            <Button onClick={submit} disabled={saveM.isPending}>
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
