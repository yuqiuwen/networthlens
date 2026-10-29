import * as React from "react";
import { ArrowDown } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * 对话滚动容器。
 *
 * 与 shadcn AI Elements 的 `Conversation` 对应：外层负责滚动与「跟随到底部」，
 * 内层 `ConversationContent` 只负责排版宽度与间距。
 *
 * 为什么不用 Radix `ScrollArea`：它的 viewport 高度是动态测量的，
 * 流式追加文字时每一帧都会改内容高度，跟随逻辑得靠 `closest()` 反查
 * `[data-radix-scroll-area-viewport]` 才能拿到滚动元素（旧实现就是这么写的）。
 * 这里直接用原生 overflow 容器 + ResizeObserver，跟随判断只依赖自身尺寸，
 * 不再依赖 DOM 结构约定。
 */

interface ConversationContextValue {
  scrollToBottom: (behavior?: ScrollBehavior) => void;
  isAtBottom: boolean;
}

const ConversationContext = React.createContext<ConversationContextValue | null>(null);

export function useConversation() {
  const ctx = React.useContext(ConversationContext);
  if (!ctx) {
    throw new Error("useConversation 必须在 <Conversation> 内部使用");
  }
  return ctx;
}

/** 距离底部多少像素以内仍视为「在底部」，避免用户差一点点就被强行拽回 */
const BOTTOM_THRESHOLD = 32;

export function Conversation({
  className,
  children,
  /**
   * 固定在视口上的浮层（回到最新按钮等）。
   *
   * 不能直接塞进 `children`：children 是**滚动内容**，浮层会跟着一起滚走。
   */
  overlay,
  ...props
}: React.ComponentProps<"div"> & { overlay?: React.ReactNode }) {
  const scrollRef = React.useRef<HTMLDivElement | null>(null);
  // 是否跟随到底部。用 ref 而不是 state：ResizeObserver 回调里要读最新值，
  // 走 state 会拿到闭包里的旧值。
  const stickRef = React.useRef(true);
  const [isAtBottom, setIsAtBottom] = React.useState(true);

  const scrollToBottom = React.useCallback((behavior: ScrollBehavior = "auto") => {
    const el = scrollRef.current;
    if (!el) return;
    stickRef.current = true;
    setIsAtBottom(true);
    el.scrollTo({ top: el.scrollHeight, behavior });
  }, []);

  /**
   * 内容变高时跟随。
   *
   * 监听内层容器而不是滚动容器本身：滚动容器的高度是固定的（flex-1），
   * 真正变化的是里面的内容，只有观察内容才能拿到每一次增量。
   */
  React.useEffect(() => {
    const el = scrollRef.current;
    const inner = el?.firstElementChild;
    if (!el || !(inner instanceof HTMLElement)) return;

    const observer = new ResizeObserver(() => {
      if (stickRef.current) el.scrollTop = el.scrollHeight;
    });
    observer.observe(inner);
    return () => observer.disconnect();
  }, []);

  const handleScroll = React.useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    const atBottom = distance <= BOTTOM_THRESHOLD;
    stickRef.current = atBottom;
    // 滚动事件触发很密，状态没变就不要重渲染
    setIsAtBottom((prev) => (prev === atBottom ? prev : atBottom));
  }, []);

  const value = React.useMemo(() => ({ scrollToBottom, isAtBottom }), [scrollToBottom, isAtBottom]);

  return (
    <ConversationContext.Provider value={value}>
      <div className={cn("relative flex min-h-0 flex-1 flex-col", className)} {...props}>
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          data-slot="conversation-viewport"
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
        >
          {children}
        </div>
        {overlay}
      </div>
    </ConversationContext.Provider>
  );
}

export function ConversationContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("mx-auto w-full max-w-3xl px-3 py-5 sm:px-6 sm:py-8", className)}
      {...props}
    />
  );
}

export function ConversationScrollButton({ className }: { className?: string }) {
  const { isAtBottom, scrollToBottom } = useConversation();

  if (isAtBottom) return null;

  return (
    <button
      type="button"
      onClick={() => scrollToBottom("smooth")}
      aria-label="回到最新消息"
      title="回到最新消息"
      className={cn(
        "absolute bottom-4 left-1/2 z-10 flex h-8 w-8 -translate-x-1/2 items-center justify-center rounded-full border bg-background/90 text-muted-foreground shadow-md backdrop-blur transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none",
        className,
      )}
    >
      <ArrowDown className="h-4 w-4" />
    </button>
  );
}
