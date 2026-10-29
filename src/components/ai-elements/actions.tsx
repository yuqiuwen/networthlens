import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * 消息下方的操作行。
 *
 * 与 shadcn AI Elements 的 `Actions` 对应。桌面端默认半透明，鼠标移到这条消息上
 * 才完全显现；触屏没有 hover，用 `max-sm:opacity-100` 保证手机上一直可见。
 */
export function Actions({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex items-center gap-0.5 opacity-60 transition-opacity duration-200 group-hover/message:opacity-100 focus-within:opacity-100 max-sm:opacity-100",
        className,
      )}
      {...props}
    />
  );
}

export function Action({
  label,
  className,
  children,
  ...props
}: React.ComponentProps<"button"> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex h-7 items-center gap-1 rounded-md px-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
