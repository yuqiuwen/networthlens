import * as React from "react";
import { Check, ChevronDown, Loader2, Route } from "lucide-react";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

/**
 * 一次回答里 Agent 走过的步骤。
 *
 * 与 shadcn AI Elements 的 `Chain of Thought` 对应：一行摘要（「已分析 2 步 · 4s」）
 * 展开后是逐步的明细。
 *
 * 这个项目的回答经常要先连续查几个工具（收支 → 资产 → 目标），
 * 以前每个工具各占一张卡片，会把对话切得很碎。现在整轮步骤收进一个可折叠块，
 * 回答本身保持干净。
 */

export function ChainOfThought({
  running = false,
  defaultOpen,
  className,
  children,
}: {
  /** 还有步骤在执行：自动展开，全部结束后自动收起 */
  running?: boolean;
  defaultOpen?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(defaultOpen ?? running);

  React.useEffect(() => {
    if (running) {
      setOpen(true);
      return;
    }
    // 执行完不要立刻收起，否则用户看不到「刚跑完」的那一帧
    const timer = window.setTimeout(() => setOpen(false), 700);
    return () => window.clearTimeout(timer);
  }, [running]);

  return (
    <Collapsible open={open} onOpenChange={setOpen} className={cn("w-full", className)}>
      {children}
    </Collapsible>
  );
}

export function ChainOfThoughtHeader({
  children,
  running = false,
  className,
}: {
  children: React.ReactNode;
  running?: boolean;
  className?: string;
}) {
  return (
    <CollapsibleTrigger asChild>
      <button
        type="button"
        className={cn(
          "group/cot -ml-1 flex w-full items-center gap-1.5 rounded-lg px-1 py-0.5 text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none",
          className,
        )}
      >
        <Route className="h-3.5 w-3.5 shrink-0" />
        <span className={cn("min-w-0 truncate text-left", running && "shimmer-text")}>
          {children}
        </span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-60 transition-transform duration-200 group-data-[state=open]/cot:rotate-180" />
      </button>
    </CollapsibleTrigger>
  );
}

export function ChainOfThoughtContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0">
      {/*
        这里**不再**画一条外框竖线：每个步骤自己带一段连接线（见 ChainOfThoughtStep），
        步骤之间首尾相接就是一条连续的线。再叠一层 border-left 会变成两条平行线。
        pl-1 让步骤图标与上方的标题图标落在同一列上。
      */}
      <div className={cn("mt-2 pl-1", className)} {...props} />
    </CollapsibleContent>
  );
}

export type ChainOfThoughtStatus = "complete" | "active" | "pending";

const STATUS_ICON: Record<ChainOfThoughtStatus, React.ReactNode> = {
  complete: <Check className="h-2.5 w-2.5" />,
  active: <Loader2 className="h-2.5 w-2.5 animate-spin" />,
  pending: <span className="h-1 w-1 rounded-full bg-current" />,
};

const STATUS_CLASS: Record<ChainOfThoughtStatus, string> = {
  complete: "text-success",
  active: "text-primary",
  pending: "text-muted-foreground",
};

/**
 * 单个步骤。
 *
 * `isLast` 用来截断连接线 —— 最后一步下方不再画线，否则会多出一截「断头线」。
 */
export function ChainOfThoughtStep({
  icon,
  label,
  description,
  status = "complete",
  isLast = false,
  className,
}: {
  icon?: React.ReactNode;
  label: React.ReactNode;
  description?: React.ReactNode;
  status?: ChainOfThoughtStatus;
  isLast?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("relative flex gap-2.5", !isLast && "pb-3", className)}>
      {!isLast && (
        <span aria-hidden className="absolute top-5 bottom-0 left-[7px] w-px bg-border" />
      )}
      <span
        aria-hidden
        className={cn(
          "z-10 mt-[3px] flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-background ring-1 ring-border",
          STATUS_CLASS[status],
        )}
      >
        {icon ?? STATUS_ICON[status]}
      </span>
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "text-xs leading-5",
            status === "active" ? "text-foreground" : "text-foreground/75",
          )}
        >
          {label}
        </p>
        {description ? (
          <p className="mt-0.5 text-[11px] leading-4 text-muted-foreground">{description}</p>
        ) : null}
      </div>
    </div>
  );
}
