import * as React from "react";
import { ArrowUp, Square } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * 输入区。
 *
 * 与 shadcn AI Elements 的 `Prompt Input` 对应：一个带边框的容器，
 * 上半是自增高的文本域，下半是提示语与发送按钮。
 *
 * 用 `<form>` 而不是裸 `<div>`：移动端键盘的回车键会触发 submit，
 * 否则手机上只能靠点小按钮发送。
 */

export function PromptInput({ className, ...props }: React.ComponentProps<"form">) {
  return (
    <form
      className={cn(
        "relative rounded-2xl border bg-background shadow-sm transition-[box-shadow,border-color] duration-200",
        "focus-within:border-ring/50 focus-within:shadow-md focus-within:ring-2 focus-within:ring-ring/15",
        className,
      )}
      {...props}
    />
  );
}

export function PromptInputTextarea({
  value,
  onValueChange,
  onSubmit,
  disabled,
  placeholder,
  textareaRef,
  className,
}: {
  value: string;
  onValueChange: (value: string) => void;
  /** 回车（非 Shift、非输入法组词中）时触发 */
  onSubmit: () => void;
  disabled?: boolean;
  placeholder?: string;
  textareaRef?: React.RefObject<HTMLTextAreaElement | null>;
  className?: string;
}) {
  const innerRef = React.useRef<HTMLTextAreaElement | null>(null);
  const composingRef = React.useRef(false);

  // 自增高：先归零再按内容撑开，否则删字时高度只增不减。
  // 上限 168px 之后交给 overflow 滚动，避免长文本把对话区挤没。
  React.useLayoutEffect(() => {
    const el = textareaRef?.current ?? innerRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 168)}px`;
  }, [value, textareaRef]);

  return (
    <textarea
      ref={(node) => {
        innerRef.current = node;
        if (textareaRef) textareaRef.current = node;
      }}
      value={value}
      rows={1}
      disabled={disabled}
      placeholder={placeholder}
      onChange={(e) => onValueChange(e.target.value)}
      onCompositionStart={() => {
        composingRef.current = true;
      }}
      onCompositionEnd={() => {
        composingRef.current = false;
      }}
      onKeyDown={(e) => {
        // 中文输入法组词时的回车是「选词」，不能当成发送
        const composing =
          composingRef.current || e.nativeEvent.isComposing || e.nativeEvent.keyCode === 229;
        if (e.key === "Enter" && !e.shiftKey && !composing) {
          e.preventDefault();
          onSubmit();
        }
      }}
      className={cn(
        "max-h-42 w-full resize-none bg-transparent px-4 pt-3 pb-1 text-sm leading-relaxed placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
    />
  );
}

export function PromptInputFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("flex items-center justify-between gap-2 px-2.5 pb-2.5 pt-1", className)}
      {...props}
    />
  );
}

export function PromptInputHint({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      className={cn("truncate px-1.5 text-[11px] text-muted-foreground/80", className)}
      {...props}
    />
  );
}

/**
 * 发送 / 停止按钮。
 *
 * `streaming` 时变成停止：这时用户最想做的不是再发一条，而是打断。
 */
export function PromptInputSubmit({
  streaming = false,
  disabled,
  onStop,
}: {
  streaming?: boolean;
  disabled?: boolean;
  onStop?: () => void;
}) {
  if (streaming) {
    return (
      <button
        type="button"
        onClick={onStop}
        aria-label="停止生成"
        title="停止生成"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border bg-background text-foreground shadow-sm transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none"
      >
        <Square className="h-3.5 w-3.5 fill-current" />
      </button>
    );
  }

  return (
    <button
      type="submit"
      disabled={disabled}
      aria-label="发送"
      title="发送"
      className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm transition-all",
        "hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none",
        "disabled:pointer-events-none disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none",
      )}
    >
      <ArrowUp className="h-4 w-4" />
    </button>
  );
}
