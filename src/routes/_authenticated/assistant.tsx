import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import {
  Bot,
  Check,
  Copy,
  Loader2,
  MessageSquare,
  MessageSquarePlus,
  MoreHorizontal,

  PanelLeftClose,
  PanelLeftOpen,
  Send,
  Square,
  Trash2,
  User,
  Wrench,
} from "lucide-react";

import { Streamdown } from "streamdown";
import { code } from "@streamdown/code";
import { mermaid } from "@streamdown/mermaid";
import { math } from "@streamdown/math";
import { cjk } from "@streamdown/cjk";
import { toast } from "sonner";

import {
  AgentRole,
  ChatEventType,
  chatApi,
  streamChat,
  type ChatMessage,
  type ChatSession,
} from "@/lib/api/chat";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";


export const Route = createFileRoute("/_authenticated/assistant")({
  head: () => ({
    meta: [
      { title: "AI 助手 · NetWorthLens" },
      { name: "description", content: "与 AI 财务助手对话，查询账户、资产与现金流洞察。" },
      { property: "og:title", content: "AI 助手 · NetWorthLens" },
      { property: "og:description", content: "与 AI 财务助手对话，获取个人财务洞察。" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AssistantPage,
});

interface ViewMessage {
  id: string;
  role: AgentRole;
  content: string;
  tool_name?: string | null;
  display_name?: string | null;
  pending?: boolean;
}

function toView(m: ChatMessage): ViewMessage {
  return { id: m.id, role: m.role, content: m.content, tool_name: m.tool_name, display_name: m.dispaly_name };
}

function pickText(data: Record<string, any>): string {
  return (
    data?.text ?? data?.message ?? ""
  ).toString();
}

function AssistantPage() {
  const qc = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ViewMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [status, setStatus] = useState<string>("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);


  const sessionsQuery = useQuery({
    queryKey: ["chat", "sessions"],
    queryFn: () => chatApi.sessions(),
  });

  const historyQuery = useQuery({
    queryKey: ["chat", "messages", activeId],
    queryFn: () => chatApi.messages(activeId as string, { size: 50 }),
    enabled: !!activeId,
  });

  useEffect(() => {
    if (!activeId) {
      setMessages([]);
      return;
    }
    const page = historyQuery.data;
    if (!page) return;
    const list = page.items ?? page.list ?? [];
    setMessages(list.map(toView));
  }, [activeId, historyQuery.data]);

  useEffect(() => {
    if (messages.length === 0) return;
    const scroll = () => {
      const el = bottomRef.current;
      if (!el) return;
      const viewport = el.closest<HTMLElement>("[data-radix-scroll-area-viewport]");
      if (viewport) viewport.scrollTop = viewport.scrollHeight;
      else el.scrollIntoView({ behavior: "auto", block: "end" });
    };
    const r1 = requestAnimationFrame(() => {
      scroll();
      requestAnimationFrame(scroll);
    });
    const t = setTimeout(scroll, 120);
    return () => {
      cancelAnimationFrame(r1);
      clearTimeout(t);
    };
  }, [activeId, messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [activeId, streaming]);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => chatApi.deleteSession(id),
    onSuccess: (_d, id) => {
      toast.success("会话已删除");
      if (activeId === id) {
        setActiveId(null);
        setMessages([]);
      }
      qc.invalidateQueries({ queryKey: ["chat", "sessions"] });
    },
    onError: (e: Error) => toast.error(e.message || "删除失败"),
  });

  const stop = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStreaming(false);
    setStatus("");
  };

  const send = async () => {
    const text = input.trim();
    if (!text || streaming) return;

    const userMsg: ViewMessage = { id: `u_${Date.now()}`, role: AgentRole.USER, content: text };
    const assistantId = `a_${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      userMsg,
      { id: assistantId, role: AgentRole.ASSISTANT, content: "", pending: true },
    ]);
    setInput("");
    setStreaming(true);
    setStatus("思考中...");

    const controller = new AbortController();
    abortRef.current = controller;

    let createdSessionId: string | null = null;

    const appendToAssistant = (chunk: string) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === assistantId ? { ...m, content: m.content + chunk } : m)),
      );
    };

    await streamChat(
      { session_id: activeId, message: text },
      {
        signal: controller.signal,
        onEvent: (evt) => {
          const data = evt.data ?? {};
          switch (evt.type) {
            case ChatEventType.START:
              if (data.session_id) createdSessionId = String(data.session_id);
              break;
            case ChatEventType.STATUS:
              setStatus(pickText(data) || "处理中...");
              break;
            case ChatEventType.TOOL_CALL:
              setStatus(`调用工具：${data?.display_name ?? data.tool_name ?? "" }`);
              setMessages((prev) => [
                ...prev,
                {
                  id: `t_${Date.now()}_${Math.random()}`,
                  role: AgentRole.TOOL,
                  content: JSON.stringify(data.arguments ?? data.args ?? data, null, 2),
                  tool_name: data.tool_name ?? data.name ?? "tool",
                  display_name: data?.display_name ?? data.tool_name ?? ""
                },
              ]);
              break;
            case ChatEventType.TOOL_RESULT:
              setStatus("分析完成");
              break;
            case ChatEventType.THINKING:
                setStatus("正在分析...");
                break;
            case ChatEventType.CONTENT:
              setStatus("");
              appendToAssistant(pickText(data));
              break;
            case ChatEventType.FINISH:
              if (data.session_id) createdSessionId = String(data.session_id);
              setStatus("");
              break;
            case ChatEventType.ERROR:
              toast.error(pickText(data) || "AI 服务异常");
              break;
          }
        },
        onDone: () => {
          setStreaming(false);
          setStatus("");
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, pending: false } : m)),
          );
          if (!activeId && createdSessionId) setActiveId(createdSessionId);
          qc.invalidateQueries({ queryKey: ["chat", "sessions"] });
        },
        onError: (err) => {
          setStreaming(false);
          setStatus("");
          toast.error(err.message || "连接失败");
        },
      },
    );
  };

  const sessions: ChatSession[] = sessionsQuery.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">AI 助手</h1>
      </div>

      <div className={cn("grid gap-4 transition-all", sidebarCollapsed ? "lg:grid-cols-[72px_1fr]" : "lg:grid-cols-[260px_1fr]")}>
        {/* 会话列表 */}
        <div className="rounded-xl border bg-card flex flex-col max-h-[80vh] overflow-hidden">
          <div className="p-3 border-b flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0"
              aria-label={sidebarCollapsed ? "展开会话列表" : "折叠会话列表"}
              onClick={() => setSidebarCollapsed((v) => !v)}
            >
              {sidebarCollapsed ? (
                <PanelLeftOpen className="h-4 w-4" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}
            </Button>
            {!sidebarCollapsed && (
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => {
                  stop();
                  setActiveId(null);
                  setMessages([]);
                }}
              >
                <MessageSquarePlus className="h-4 w-4 mr-2" />
                新建对话
              </Button>
            )}
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {sessionsQuery.isLoading && (
                <div className="p-3 text-sm text-muted-foreground">加载中...</div>
              )}
              {!sessionsQuery.isLoading && sessions.length === 0 && (
                <div className="p-3 text-sm text-muted-foreground">暂无会话</div>
              )}
              {sessions.map((s) => (
                <SessionItem
                  key={s.id}
                  session={s}
                  activeId={activeId}
                  collapsed={sidebarCollapsed}
                  onActivate={() => {
                    stop();
                    setActiveId(s.id);
                  }}
                  onDelete={() => deleteMutation.mutate(s.id)}
                />
              ))}
            </div>
          </ScrollArea>
        </div>


        {/* 对话区 */}
        <div className="rounded-xl border bg-card flex flex-col h-[80vh]">
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages.length === 0 && !streaming && (
                <div className="h-full flex flex-col items-center justify-center text-center py-16 text-muted-foreground">
                  <Bot className="h-10 w-10 mb-3 text-primary" />
                  <p className="text-sm">向 AI 助手提问，例如「本月我的支出结构如何？」</p>
                </div>
              )}
              {messages.map((m) => (
                <MessageBubble key={m.id} message={m} />
              ))}
              {status && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  {status}
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          </ScrollArea>

          <div className="border-t p-3">
            <div className="flex items-end gap-2">
              <Textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void send();
                  }
                }}
                placeholder="输入消息，Enter 发送，Shift+Enter 换行"
                className="min-h-[56px] max-h-40 resize-none"
              />
              {streaming ? (
                <Button variant="outline" size="icon" onClick={stop} aria-label="停止">
                  <Square className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  size="icon"
                  onClick={() => void send()}
                  disabled={!input.trim()}
                  aria-label="发送"
                >
                  <Send className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SessionItem({
  session,
  activeId,
  collapsed,
  onActivate,
  onDelete,
}: {
  session: ChatSession;
  activeId: string | null;
  collapsed: boolean;
  onActivate: () => void;
  onDelete: () => void;
}) {
  const title = session.title || "未命名会话";

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={onActivate}
        className={cn(
          "w-full flex items-center justify-center rounded-lg px-2 py-2 text-sm hover:bg-muted",
          activeId === session.id && "bg-muted font-medium",
        )}
        title={title}
        aria-label={title}
      >
        <MessageSquarePlus className="h-4 w-4" />
      </button>
    );
  }

  return (
    <div
      className={cn(
        "group flex items-center gap-1 rounded-lg px-2 py-2 text-sm cursor-pointer hover:bg-muted",
        activeId === session.id && "bg-muted font-medium",
      )}
      onClick={onActivate}
    >
      <span className="flex-1 min-w-0 truncate">{title}</span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 shrink-0 text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-muted"
            aria-label="会话操作"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" side="right">
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            删除
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function MessageBubble({ message }: { message: ViewMessage }) {

  if (message.role === AgentRole.TOOL) {
    return (
      <details className="rounded-lg border bg-muted/40 px-3 py-2 text-xs">
        <summary className="cursor-pointer flex items-center gap-2 text-muted-foreground">
          <Wrench className="h-3.5 w-3.5" />
          工具调用：{message.display_name ?? message.tool_name}
        </summary>
        <pre className="mt-2 whitespace-pre-wrap break-all text-muted-foreground">
          {message.content}
        </pre>
      </details>
    );
  }

  const isUser = message.role === AgentRole.USER;

  return (
    <div className={cn("group flex gap-3", isUser && "flex-row-reverse")}>
      <div
        className={cn(
          "h-7 w-7 shrink-0 rounded-full flex items-center justify-center",
          isUser ? "bg-primary/15 text-primary" : "bg-muted text-foreground",
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      <div className={cn("max-w-[80%] min-w-0", isUser && "flex flex-col items-end")}>
        <div
          className={cn(
            "text-sm leading-relaxed break-words",
            isUser
              ? "rounded-2xl bg-primary text-primary-foreground px-3.5 py-2 whitespace-pre-wrap"
              : "text-foreground",
          )}
        >
          {isUser ? (
            message.content
          ) : message.content ? (
            <Markdown key={message.id} content={message.content} isPending={message.pending ?? false}/>
          ) : message.pending ? (
            "…"
          ) : null}
        </div>
        {!!message.content && (
          <CopyButton text={message.content} className={cn(isUser && "self-end")} />
        )}
      </div>
    </div>
  );
}

function CopyButton({ text, className }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      aria-label="复制"
      className={cn(
        "mt-1 inline-flex items-center gap-1 rounded-md p-1 text-xs text-muted-foreground opacity-0 transition hover:text-foreground group-hover:opacity-100 focus-visible:opacity-100",
        className,
      )}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          toast.error("复制失败");
        }
      }}
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

function Markdown({ key, content, isPending }: { key: string; content: string; isPending: boolean }) {
  return (
    <Streamdown
      key={key}
      className="space-y-2 text-sm [&_a]:text-primary [&_a]:underline [&_h1]:text-base [&_h1]:font-semibold [&_h2]:text-sm [&_h2]:font-semibold [&_h3]:text-sm [&_h3]:font-semibold"
      shikiTheme={["github-light", "github-dark"]}
      animated
      isAnimating={isPending}
      plugins={{ code, mermaid, math, cjk }}
    >
      {content}
    </Streamdown>
  );
}
