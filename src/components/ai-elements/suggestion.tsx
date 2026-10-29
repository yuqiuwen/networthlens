import * as React from "react";
import { Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * 空态里的一句话示例问题。
 *
 * 与 shadcn AI Elements 的 `Suggestion` 对应。点一下即发送，
 * 目的是降低「第一句话该问什么」的门槛。
 */
export function Suggestions({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("grid w-full gap-2 sm:grid-cols-2", className)} {...props} />;
}

export function Suggestion({
  children,
  onClick,
  disabled,
  className,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "group flex items-center gap-2.5 rounded-xl border bg-card px-3.5 py-3 text-left text-sm text-foreground/80 transition-all",
        "hover:-translate-y-px hover:border-primary/35 hover:bg-accent/60 hover:text-accent-foreground hover:shadow-sm",
        "focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none",
        "disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
    >
      <Sparkles className="h-4 w-4 shrink-0 text-primary/60 transition-colors group-hover:text-primary" />
      <span className="min-w-0">{children}</span>
    </button>
  );
}
