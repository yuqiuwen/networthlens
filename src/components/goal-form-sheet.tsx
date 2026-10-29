import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import type { CreateGoalPayload, GoalItem, UpdateGoalPayload } from "@/lib/api/goal";
import { GoalPriorityOptions, GoalType, GoalTypeOptions } from "@/lib/constant";
import { formatCents, monthlySuggestedSaving, yuanToCents } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { DatePicker } from "@/components/date-picker";

interface FormState {
  name: string;
  goal_type: GoalType;
  target_amount: string; // 元
  start_date: string;
  deadline: string;
  priority: number;
  initial_amount: string; // 元，仅新建时可填
  note: string;
}

const todayKey = () => {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
};

const emptyForm = (): FormState => ({
  name: "",
  goal_type: GoalType.OTHER,
  target_amount: "",
  start_date: todayKey(),
  deadline: "",
  priority: 100,
  initial_amount: "",
  note: "",
});

const fromGoal = (goal: GoalItem): FormState => ({
  name: goal.name,
  goal_type: goal.goal_type,
  target_amount: String(goal.target_amount / 100),
  start_date: goal.start_date ?? "",
  deadline: goal.deadline ?? "",
  priority: goal.priority,
  initial_amount: "",
  note: goal.note ?? "",
});

export function GoalFormSheet({
  open,
  onOpenChange,
  editing,
  preset,
  onSubmit,
  submitting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 传入则为编辑模式 */
  editing: GoalItem | null;
  /** 新建时用于预填（例如空态里的推荐模板） */
  preset?: Partial<CreateGoalPayload> | null;
  onSubmit: (payload: CreateGoalPayload | UpdateGoalPayload, editingId: string | null) => void;
  submitting: boolean;
}) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);

  // 打开时按「新建 / 编辑」重置表单，避免上一次的残留。
  useEffect(() => {
    if (!open) return;

    if (editing) {
      setForm(fromGoal(editing));
    } else {
      const base = emptyForm();
      if (preset) {
        setForm({
          ...base,
          name: preset.name ?? base.name,
          goal_type: preset.goal_type ?? base.goal_type,
          target_amount:
            preset.target_amount != null ? String(preset.target_amount / 100) : base.target_amount,
        });
      } else {
        setForm(base);
      }
    }

    setError(null);
  }, [open, editing, preset]);

  const targetCents = yuanToCents(form.target_amount);
  const initialCents = yuanToCents(form.initial_amount);
  const savedCents = editing ? editing.current_amount : initialCents;
  const remainingCents = Math.max(targetCents - savedCents, 0);

  // 表单内实时预览：与后端 GoalService._derive 同一套算法（§7.2）。
  const suggested = monthlySuggestedSaving(remainingCents, form.deadline);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = () => {
    const name = form.name.trim();

    if (!name) return setError("请填写目标名称");
    if (name.length > 100) return setError("目标名称最多 100 个字");
    if (targetCents <= 0) return setError("目标金额必须大于 0");
    if (form.start_date && form.deadline && form.deadline < form.start_date) {
      return setError("计划完成日期不能早于开始日期");
    }
    if (initialCents < 0) return setError("初始金额不能为负数");

    setError(null);

    const base = {
      name,
      goal_type: form.goal_type,
      target_amount: targetCents,
      start_date: form.start_date || null,
      deadline: form.deadline || null,
      priority: form.priority,
      note: form.note.trim() || null,
    };

    if (editing) {
      onSubmit(base as UpdateGoalPayload, editing.id);
    } else {
      onSubmit({ ...base, initial_amount: initialCents } as CreateGoalPayload, null);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-md"
      >
        <SheetHeader className="border-b p-6 text-left">
          <SheetTitle className="font-display">{editing ? "编辑目标" : "新建目标"}</SheetTitle>
          <SheetDescription>
            {editing
              ? "修改目标信息不会影响已有的追加记录。"
              : "设定一个金额与期限，把「想存钱」变成可追踪的进度。"}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-5 p-6">
          <div className="space-y-2">
            <Label htmlFor="goal-name">
              目标名称 <span className="text-destructive">*</span>
            </Label>
            <Input
              id="goal-name"
              value={form.name}
              maxLength={100}
              placeholder="例如：6 个月应急金"
              onChange={(e) => set("name", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>目标类型</Label>
            <Select
              value={String(form.goal_type)}
              onValueChange={(v) => set("goal_type", Number(v) as GoalType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GoalTypeOptions.map((t) => (
                  <SelectItem key={t.value} value={String(t.value)}>
                    <span className="mr-2">{t.icon}</span>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="goal-target">
              目标金额（元） <span className="text-destructive">*</span>
            </Label>
            <Input
              id="goal-target"
              type="text"
              inputMode="decimal"
              value={form.target_amount}
              placeholder="100000"
              onChange={(e) => set("target_amount", e.target.value)}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>开始日期</Label>
              <DatePicker
                value={form.start_date}
                onChange={(v) => set("start_date", v ?? "")}
                placeholder="选择开始日期"
              />
            </div>
            <div className="space-y-2">
              <Label>计划完成日期</Label>
              <DatePicker
                value={form.deadline}
                onChange={(v) => set("deadline", v ?? "")}
                placeholder="可留空"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>优先级</Label>
            <Select value={String(form.priority)} onValueChange={(v) => set("priority", Number(v))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GoalPriorityOptions.map((p) => (
                  <SelectItem key={p.value} value={String(p.value)}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {!editing && (
            <div className="space-y-2">
              <Label htmlFor="goal-initial">初始金额（元）</Label>
              <Input
                id="goal-initial"
                type="text"
                inputMode="decimal"
                value={form.initial_amount}
                placeholder="0"
                onChange={(e) => set("initial_amount", e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                已经存进去的部分。填写后会生成一条追加记录。
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="goal-note">备注</Label>
            <Textarea
              id="goal-note"
              value={form.note}
              maxLength={500}
              rows={3}
              placeholder="可选"
              onChange={(e) => set("note", e.target.value)}
            />
          </div>

          {/* 实时预览 */}
          {targetCents > 0 && (
            <div className="rounded-lg border bg-muted/40 p-4 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">还需存</span>
                <span className="font-display font-semibold tabular-nums">
                  {formatCents(remainingCents)}
                </span>
              </div>
              {suggested != null ? (
                <div className="mt-2 flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">月度建议储蓄</span>
                  <span className="font-display font-semibold tabular-nums text-primary">
                    {formatCents(suggested)}
                  </span>
                </div>
              ) : (
                <p className="mt-2 text-xs text-muted-foreground">
                  {form.deadline
                    ? "截止日已过或就在今天，建议尽快补足。"
                    : "填写计划完成日期后，会自动算出每月需要存多少。"}
                </p>
              )}
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <SheetFooter className="border-t p-6 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {editing ? "保存" : "创建目标"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
