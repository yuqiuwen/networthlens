import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { categoryWordApi } from "@/lib/api/category-word";
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
  const [word, setWord] = useState("");
  const [priority, setPriority] = useState("0");

  const q = useQuery({ queryKey: QK, queryFn: categoryWordApi.list });

  const rows = useMemo(() => {
    const k = keyword.trim().toLowerCase();
    const list = q.data ?? [];
    return k ? list.filter((r) => r.word.toLowerCase().includes(k)) : list;
  }, [q.data, keyword]);

  const createM = useMutation({
    mutationFn: categoryWordApi.create,
    onSuccess: () => {
      toast.success("匹配词已添加");
      setOpen(false);
      setWord("");
      setPriority("0");
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
    if (!words.length) return toast.error("请输入匹配词");
    const tooLong = words.find((w) => w.length > 20);
    if (tooLong) return toast.error(`「${tooLong}」超过 20 个字符`);
    const p = Number(priority) || 0;
    createM.mutate(words.map((w) => ({ word: w, priority: p })));
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
          <Button onClick={() => setOpen(true)}>
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
            <TableHead>匹配词</TableHead>
            <TableHead className="w-32">优先级</TableHead>
            <TableHead className="w-20 text-right">操作</TableHead>
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
                <TableCell className="font-medium">{r.word}</TableCell>
                <TableCell>{r.priority}</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => {
                      if (confirm(`确定删除「${r.word}」？`)) removeM.mutate([r.id]);
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
            <DialogTitle>新增匹配词</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>匹配词</Label>
              <Textarea
                value={word}
                rows={4}
                onChange={(e) => setWord(e.target.value)}
                placeholder="多个以逗号隔开，每个最多 20 个字符"
              />
            </div>
            <div className="space-y-2">
              <Label>优先级（统一应用到本次所有匹配词）</Label>
              <Input
                type="number"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              取消
            </Button>
            <Button onClick={submit} disabled={createM.isPending}>
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
