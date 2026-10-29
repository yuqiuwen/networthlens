import * as React from "react";
import { Brain, ChevronDown } from "lucide-react";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

/**
 * 模型的思考过程。
 *
 * 与 shadcn AI Elements 的 `Reasoning` 对应：默认展开、流式结束后自动收起，
 * 收成一行「已思考 3 秒」。用户想看细节时再点开，不占用回答的空间。
 *
 * 注意本项目后端**不会**把模型原始思维链透出给前端（`app/services/agent/chat.py`
 * 里 `ThinkingPartDelta` 只转成一个安全的 THINKING 状态事件），所以这里展示的是
 * 状态说明而不是逐字推理。哪天后端决定放开，把文本塞进 `children` 即可，
 * 组件本身不用改。
 */
export function Reasoning({
  isStreaming = false,
  startedAt,
  durationMs,
  children,
  className,
}: {
  isStreaming?: boolean;
  /** 思考开始的毫秒时间戳，用于流式期间实时计时 */
  startedAt?: number;
  /** 思考耗时；流式结束后由父组件算好传进来 */
  durationMs?: number;
  children?: React.ReactNode;
  className?: string;
}) {
  const [open, setOpen] = React.useState(isStreaming);
  const [now, setNow] = React.useState(() => Date.now());

  // 流式期间每秒刷新一次计时器，结束后停掉
  React.useEffect(() => {
    if (!isStreaming) return;
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(id);
  }, [isStreaming]);

  // 开始思考就展开；思考结束留 800ms 让用户看到最后一眼，再自动收起
  React.useEffect(() => {
    if (isStreaming) {
      setOpen(true);
      return;
    }
    const timer = window.setTimeout(() => setOpen(false), 800);
    return () => window.clearTimeout(timer);
  }, [isStreaming]);

  const elapsedMs = durationMs ?? (startedAt ? Math.max(0, now - startedAt) : 0);
  const seconds = elapsedMs > 0 ? Math.max(1, Math.round(elapsedMs / 1000)) : null;

  return (
    <Collapsible open={open} onOpenChange={setOpen} className={cn("w-full", className)}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="group/reasoning -ml-1 inline-flex max-w-full items-center gap-1.5 rounded-lg px-1 py-0.5 text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none"
        >
          <Brain className="h-3.5 w-3.5 shrink-0" />
          {isStreaming ? (
            <span className="shimmer-text">正在思考{seconds ? ` · ${seconds}s` : "…"}</span>
          ) : (
            <span>{seconds ? `已思考 ${seconds} 秒` : "已思考"}</span>
          )}
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 shrink-0 opacity-60 transition-transform duration-200",
              open && "rotate-180",
            )}
          />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0">
        <div className="mt-1.5 ml-0.5 border-l-2 border-border py-0.5 pl-3 text-xs leading-relaxed text-muted-foreground">
          {children ?? (isStreaming ? "正在理解你的问题…" : "已完成问题理解并生成回答。")}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
