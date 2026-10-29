import { cn } from "@/lib/utils";

/**
 * 生成中的指示器。
 *
 * 与 shadcn AI Elements 的 `Loader` 对应。三个点用不同的动画延迟错开，
 * 比一个转圈的图标更贴近「正在逐字生成」的语感；同时配合 shimmer 文字，
 * 让「正在思考」这一行本身有流动感，而不是静止的灰字。
 */
export function Loader({ text, className }: { text?: string; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-sm text-muted-foreground", className)}>
      <span className="inline-flex items-center gap-1" aria-hidden>
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.3s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.15s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current" />
      </span>
      {text ? <span className="shimmer-text text-xs">{text}</span> : null}
    </span>
  );
}

/** 只有文字在流动的加载态，用于状态行、工具执行中等场景 */
export function ShimmerText({ children, className }: React.ComponentProps<"span">) {
  return <span className={cn("shimmer-text", className)}>{children}</span>;
}
