import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * 一轮消息。
 *
 * 与 shadcn AI Elements 的 `Message` 对应，只有两种形态：
 * - `from="user"`：右对齐的实心气泡，短、紧凑，一眼能和回答区分开；
 * - `from="assistant"`：左对齐、无气泡。回答里常有表格/图表/列表，
 *   套一层气泡会把可用宽度吃掉，而且大段 Markdown 在气泡里显得局促。
 */

export type MessageFrom = "user" | "assistant" | "system";

export function Message({
  from,
  className,
  children,
  ...props
}: React.ComponentProps<"div"> & { from: MessageFrom }) {
  return (
    <div
      data-role={from}
      className={cn(
        "group/message flex w-full gap-3",
        from === "user" ? "justify-end" : "items-start",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function MessageAvatar({ className, children, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/8 ring-1 ring-primary/15",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function MessageContent({
  from,
  className,
  children,
  ...props
}: React.ComponentProps<"div"> & { from: MessageFrom }) {
  return (
    <div
      className={cn(
        "min-w-0 text-sm leading-relaxed break-words",
        from === "user"
          ? "max-w-[85%] rounded-2xl rounded-br-md bg-primary px-4 py-2.5 whitespace-pre-wrap text-primary-foreground shadow-sm sm:max-w-[75%]"
          : "flex-1 pt-0.5 text-foreground",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
