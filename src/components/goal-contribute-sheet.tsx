import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import type { CreateContributionPayload, GoalItem } from "@/lib/api/goal";
import { formatCents, yuanToCents } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { DatePicker } from "@/components/date-picker";
import { cn } from "@/lib/utils";

type Direction = "in" | "out";

const todayKey = () => {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
};

/**
 * 追加 / 取出资金。
 *
 * 交互上用「存入 / 取出」二选一 + 正数金额，避免让用户自己输入负号。
 * 提交时「取出」会把金额取负 —— 后端约定正数=存入、负数=取出。
 */
export function GoalContributeSheet({
  open,
  onOpenChange,
  goal,
  onSubmit,
  submitting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal: GoalItem | null;
  onSubmit: (payload: CreateContributionPayload) => void;
  submitting: boolean;
}) {
  const [direction, setDirection] = useState<Direction>("in");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setDirection("in");
    setAmount("");
    setDate("");
    setNote("");
    setError(null);
  }, [open]);

  const currentCents = goal?.current_amount ?? 0;
  const targetCents = goal?.target_amount ?? 0;
  const cents = yuanToCents(amount);
  const signed = direction === "in" ? cents : -cents;

  // 预览追加后的进度
  const nextCents = currentCents + signed;
  const nextProgress = targetCents > 0 ? Math.min(Math.max(nextCents / targetCents, 0), 1) : 0;
  const willReach = targetCents > 0 && nextCents >= targetCents && currentCents < targetCents;

  const handleSubmit = () => {
    if (!goal) return;
    if (cents <= 0) return setError("请填写大于 0 的金额");
    if (direction === "out" && cents > currentCents) {
      return setError(`取出金额不能超过已存金额（${formatCents(currentCents)}）`);
    }

    setError(null);
    onSubmit({
      amount: signed,
      contributed_at: date ? `${date}T00:00:00` : null,
      note: note.trim() || null,
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-md"
      >
        <SheetHeader className="border-b p-6 text-left">
          <SheetTitle className="font-display">追加资金</SheetTitle>
          <SheetDescription className="truncate">{goal?.name ?? ""}</SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-5 p-6">
          <div className="space-y-2">
            <Label>操作</Label>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { key: "in", label: "存入" },
                  { key: "out", label: "取出" },
                ] as const
              ).map((opt) => (
                <Button
                  key={opt.key}
                  type="button"
                  variant={direction === opt.key ? "default" : "outline"}
                  onClick={() => {
                    setDirection(opt.key);
                    setError(null);
                  }}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="contrib-amount">
              金额（元） <span className="text-destructive">*</span>
            </Label>
            <Input
              id="contrib-amount"
              type="text"
              inputMode="decimal"
              value={amount}
              placeholder="3000"
              onChange={(e) => {
                setAmount(e.target.value);
                setError(null);
              }}
            />
            <p className="text-xs text-muted-foreground">
              当前已存 {formatCents(currentCents)}
              {targetCents > 0 && ` / 目标 ${formatCents(targetCents)}`}
            </p>
          </div>

          <div className="space-y-2">
            <Label>日期</Label>
            <DatePicker
              value={date}
              onChange={(v) => setDate(v ?? "")}
              placeholder={`默认今天（${todayKey()}）`}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contrib-note">备注</Label>
            <Textarea
              id="contrib-note"
              value={note}
              maxLength={500}
              rows={3}
              placeholder="可选"
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          {cents > 0 && (
            <div className="rounded-lg border bg-muted/40 p-4 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">
                  {direction === "in" ? "追加后进度" : "取出后进度"}
                </span>
                <span
                  className={cn(
                    "font-display font-semibold tabular-nums",
                    direction === "out" && "text-amber-600 dark:text-amber-400",
                  )}
                >
                  {formatCents(nextCents)}
                </span>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                进度 {(nextProgress * 100).toFixed(1)}%{willReach && " · 即将达成目标"}
              </div>
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
            {direction === "in" ? "存入" : "取出"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
