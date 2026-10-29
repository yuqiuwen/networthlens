import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  Copy,
  Menu,
  MessageSquarePlus,
  MoreHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
  useConversation,
} from "@/components/ai-elements/conversation";
import { Message, MessageAvatar, MessageContent } from "@/components/ai-elements/message";
import { Response } from "@/components/ai-elements/response";
import { Reasoning } from "@/components/ai-elements/reasoning";
import {
  ChainOfThought,
  ChainOfThoughtContent,
  ChainOfThoughtHeader,
} from "@/components/ai-elements/chain-of-thought";
import { Tool } from "@/components/ai-elements/tool";
import { Actions, Action } from "@/components/ai-elements/actions";
import { Suggestions, Suggestion } from "@/components/ai-elements/suggestion";
import { Loader } from "@/components/ai-elements/loader";
import {
  PromptInput,
  PromptInputFooter,
  PromptInputHint,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import { LogoMark } from "@/components/logo";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/assistant")({
  // 支持从其他页面深链一个问题，例如 /assistant?q=我今年攒下多少钱
  validateSearch: (search: Record<string, unknown>): { q?: string } => {
    const q = typeof search.q === "string" ? search.q.trim() : "";
    return q ? { q } : {};
  },
  head: () => ({
    meta: [
      { title: "AI 助手 · Finora" },
      { name: "description", content: "与 AI 财务助手对话，查询账户、资产与现金流洞察。" },
      { property: "og:title", content: "AI 助手 · Finora" },
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
  /** 用于把 TOOL_RESULT 落到对应的工具卡片上 */
  tool_call_id?: string | null;
  /** 工具是否已执行完毕 */
  done?: boolean;
  pending?: boolean;
  /** 本轮开始等待回答的时间戳，用于思考指示器计时 */
  thinkingStartedAt?: number;
  /** 这条回答消耗的 token，只有历史消息带得回来 */
  tokenCount?: number | null;
}

const SUGGESTIONS = [
  "本月我的支出结构如何？",
  "分析一下我今年的收支趋势",
  "我目前的总资产和负债情况？",
  "哪些分类的花费最多？",
];

function toView(m: ChatMessage): ViewMessage {
  return {
    id: m.id,
    role: m.role,
    content: m.content,
    tool_name: m.tool_name,
    display_name: m.display_name,
    tokenCount: m.token_count,
    // 历史里的工具消息一律视为已完成
    done: true,
  };
}

function pickText(data: Record<string, unknown>): string {
  return String(data?.text ?? data?.message ?? "");
}

/**
 * 把扁平的消息列表整理成「轮次」。
 *
 * 后端落库顺序是 用户 → 工具 → 回答（ULID 保证），历史接口也是这个顺序；
 * 流式渲染时工具卡片同样插在回答气泡之前。因此只要按「用户消息开一轮、
 * 遇到回答就把此前累积的工具挂上去」来切，两种路径就得到完全一致的结构：
 *
 *   { user, tools: [...], assistant }
 *
 * 这样整轮的工具调用可以收进同一个 Chain of Thought，而不是散在对话里。
 */
type Turn = {
  key: string;
  user?: ViewMessage;
  assistant?: ViewMessage;
  tools: ViewMessage[];
};

function groupTurns(messages: ViewMessage[]): Turn[] {
  const turns: Turn[] = [];
  let tools: ViewMessage[] = [];

  const flushOrphanTools = () => {
    if (!tools.length) return;
    const last = turns[turns.length - 1];
    // 上一轮还没有回答（例如被中断）就并进那一轮，避免凭空多出一张孤立卡片
    if (last && !last.assistant) last.tools.push(...tools);
    else turns.push({ key: `tools_${tools[0].id}`, tools: [...tools] });
    tools = [];
  };

  for (const message of messages) {
    if (message.role === AgentRole.TOOL) {
      tools.push(message);
      continue;
    }

    if (message.role === AgentRole.USER) {
      flushOrphanTools();
      turns.push({ key: message.id, user: message, tools: [] });
      continue;
    }

    turns.push({ key: message.id, assistant: message, tools });
    tools = [];
  }

  flushOrphanTools();
  return turns;
}

function groupSessions(sessions: ChatSession[]) {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfYesterday = startOfToday - 86_400_000;

  const today: ChatSession[] = [];
  const yesterday: ChatSession[] = [];
  const earlier: ChatSession[] = [];

  for (const s of sessions) {
    const t = new Date(s.ctime).getTime();
    if (Number.isNaN(t) || t < startOfYesterday) earlier.push(s);
    else if (t >= startOfToday) today.push(s);
    else yesterday.push(s);
  }

  return [
    { label: "今天", items: today },
    { label: "昨天", items: yesterday },
    { label: "更早", items: earlier },
  ].filter((g) => g.items.length > 0);
}

function formatTokens(n: number): string {
  if (n < 1000) return `${n} tokens`;
  return `${(n / 1000).toFixed(1)}k tokens`;
}

/** 工具消息的展示文案：优先用后端渲染好的人话，退回到中文工具名 */
function toolLabel(tool: ViewMessage): string {
  const content = tool.content?.trim();
  if (content && !content.startsWith("{")) return content;
  return tool.display_name || tool.tool_name || "工具";
}

function AssistantPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { q: deepLinkQuestion } = Route.useSearch();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ViewMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [status, setStatus] = useState<string>("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  // 移动端：会话列表默认收起，通过头部按钮以抽屉形式展开，
  // 否则侧栏会占掉大半屏高度，把对话区挤没了。
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<ChatSession | null>(null);
  const [renameValue, setRenameValue] = useState("");
  // 每发一次消息自增一次，通知对话区强制滚到底部
  const [scrollSignal, setScrollSignal] = useState(0);
  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const deepLinkHandledRef = useRef(false);
  // streaming 是 state，同一个事件循环里连按两次 Enter 都会通过它的判断，
  // 用 ref 做真正的并发闸门。
  const sendingRef = useRef(false);

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
    if (!page) {
      // 新会话的历史还没回来。这里必须先清空，否则会短暂显示
      // 上一个会话的消息（标题已经是新的了，内容还是旧的）。
      setMessages([]);
      return;
    }
    const list = page.items ?? page.list ?? [];
    setMessages(list.map(toView));
  }, [activeId, historyQuery.data]);

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

  const renameMutation = useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) => chatApi.renameSession(id, title),
    onSuccess: (session) => {
      toast.success("会话已重命名");
      setRenameTarget(null);
      qc.setQueryData<ChatSession[]>(["chat", "sessions"], (prev) =>
        prev?.map((s) => (s.id === session.id ? { ...s, title: session.title } : s)),
      );
      qc.invalidateQueries({ queryKey: ["chat", "sessions"] });
    },
    onError: (e: Error) => toast.error(e.message || "重命名失败"),
  });

  const openRename = (session: ChatSession) => {
    setRenameTarget(session);
    setRenameValue(session.title || "");
  };

  const submitRename = () => {
    if (!renameTarget) return;
    const title = renameValue.trim();
    if (!title) {
      toast.error("会话名称不能为空");
      return;
    }
    if (title === (renameTarget.title || "")) {
      setRenameTarget(null);
      return;
    }
    renameMutation.mutate({ id: renameTarget.id, title });
  };

  // 清掉所有还处于 pending 的气泡。停止 / 出错时必须调用，否则
  // 「正在思考」的指示器会一直转，或 Markdown 的动画光标一直闪。
  const settlePending = () => {
    setMessages((prev) =>
      prev.some((m) => m.pending)
        ? prev.map((m) => (m.pending ? { ...m, pending: false } : m))
        : prev,
    );
  };

  const stop = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    sendingRef.current = false;
    setStreaming(false);
    setStatus("");
    settlePending();
  };

  const startNewChat = () => {
    stop();
    setActiveId(null);
    setMessages([]);
    setInput("");
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const send = async (raw?: string) => {
    const text = (raw ?? input).trim();
    if (!text || sendingRef.current) return;

    sendingRef.current = true;

    const userMsg: ViewMessage = { id: `u_${Date.now()}`, role: AgentRole.USER, content: text };
    const assistantId = `a_${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      userMsg,
      {
        id: assistantId,
        role: AgentRole.ASSISTANT,
        content: "",
        pending: true,
        // 从点击发送就开始计时：用户关心的是「等了多久」，不是首字延迟
        thinkingStartedAt: Date.now(),
      },
    ]);
    setInput("");
    setStreaming(true);
    setStatus("思考中...");
    setScrollSignal((n) => n + 1);

    const controller = new AbortController();
    abortRef.current = controller;

    let createdSessionId: string | null = activeId;

    const appendToAssistant = (chunk: string) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === assistantId ? { ...m, content: m.content + chunk } : m)),
      );
    };

    // 结束时的统一收尾。正常结束、用户停止、出错三条路径都必须走到这里，
    // 否则 loading 与 pending 会残留。
    const settle = () => {
      sendingRef.current = false;
      abortRef.current = null;
      setStreaming(false);
      setStatus("");
      settlePending();
      if (!activeId && createdSessionId) setActiveId(createdSessionId);
      qc.invalidateQueries({ queryKey: ["chat", "sessions"] });
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
            case ChatEventType.TOOL_CALL: {
              setStatus(`调用工具：${data?.display_name ?? data.tool_name ?? ""}`);

              // content 直接用后端给的 text —— 那已经是一句人话
              // （「分析收支情况（按年，近 12 期）」）。参数 JSON 不再上屏：
              // {"granularity":"year"} 对用户没有任何意义。
              const card: ViewMessage = {
                id: `t_${Date.now()}_${Math.random()}`,
                role: AgentRole.TOOL,
                content: String(data.text ?? ""),
                tool_name: data.tool_name ?? data.name ?? "tool",
                display_name: data?.display_name ?? data.tool_name ?? "",
                tool_call_id: data.tool_call_id ? String(data.tool_call_id) : null,
                done: false,
              };

              setMessages((prev) => {
                // 插到回答气泡之前：刷新后历史里的顺序是
                // 用户消息 → 工具消息 → 回答，两边保持一致。
                const idx = prev.findIndex((m) => m.id === assistantId);
                if (idx === -1) return [...prev, card];
                const next = prev.slice();
                next.splice(idx, 0, card);
                return next;
              });
              break;
            }
            case ChatEventType.TOOL_RESULT:
              setStatus("分析完成");
              // 按 tool_call_id 精确落到对应卡片，多个工具并行时也不会串。
              setMessages((prev) =>
                prev.map((m) =>
                  m.role === AgentRole.TOOL &&
                  m.tool_call_id &&
                  m.tool_call_id === String(data.tool_call_id ?? "")
                    ? { ...m, done: true }
                    : m,
                ),
              );
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
              if (data.session_id) createdSessionId = String(data.session_id);
              toast.error(pickText(data) || "AI 服务异常");
              break;
          }
        },
        onDone: settle,
        onAbort: settle,
        onError: (err) => {
          settle();
          toast.error(err.message || "连接失败");
        },
      },
    );
  };

  // 深链：/assistant?q=xxx 进入后自动发问一次，随后清掉参数避免刷新重发
  useEffect(() => {
    if (deepLinkHandledRef.current || !deepLinkQuestion) return;
    deepLinkHandledRef.current = true;
    void send(deepLinkQuestion);
    void navigate({ to: "/assistant", search: {}, replace: true });
    // send 每次渲染都会重建，用 ref 守卫保证只执行一次，故不列入依赖
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deepLinkQuestion, navigate]);

  const sessions: ChatSession[] = sessionsQuery.data ?? [];
  const groups = groupSessions(sessions);
  const activeSession = sessions.find((s) => s.id === activeId) ?? null;
  // 历史还在加载时不要显示欢迎页，否则切换会话会闪一下示例问题
  const historyLoading = !!activeId && historyQuery.isLoading;
  const isEmpty = messages.length === 0 && !streaming && !historyLoading;

  const turns = useMemo(() => groupTurns(messages), [messages]);

  // 移动端抽屉：按 Esc 关闭
  useEffect(() => {
    if (!mobileSidebarOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileSidebarOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileSidebarOpen]);

  const submit = () => {
    void send();
  };

  return (
    <div>
      <div className="flex h-[calc(100dvh-6rem)] min-h-[380px] flex-col overflow-hidden rounded-2xl border bg-card shadow-sm sm:h-[calc(100dvh-9rem)] lg:h-[calc(100dvh-7.5rem)] lg:flex-row">
        {/* 移动端抽屉遮罩 */}
        {mobileSidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/40 lg:hidden"
            onClick={() => setMobileSidebarOpen(false)}
            aria-hidden
          />
        )}

        {/* ===== 会话侧栏 ===== */}
        <aside
          className={cn(
            // 移动端抽屉必须是不透明背景，否则会透出后面的对话内容；
            // 桌面端嵌在卡片里，用半透明灰做层次区分即可。
            "flex flex-col border-r bg-background lg:bg-muted/25",
            // 移动端：固定定位抽屉，从左滑入
            "fixed inset-y-0 left-0 z-50 w-[280px] max-w-[85vw] shadow-xl transition-transform duration-200",
            mobileSidebarOpen ? "translate-x-0" : "-translate-x-full",
            // 桌面端：回到文档流，宽度由折叠状态决定
            "lg:static lg:z-auto lg:max-w-none lg:shrink-0 lg:translate-x-0 lg:shadow-none lg:transition-none",
            // 收起后整条侧栏隐藏（而不是压成 68px 只显示一个字的窄条），
            // 「新建对话 / 展开」改由对话区顶栏承载。
            sidebarCollapsed ? "lg:hidden" : "lg:w-[264px]",
          )}
        >
          <div className="flex items-center gap-2 border-b p-3">
            <Button
              className="h-9 flex-1 justify-start gap-2 rounded-lg"
              aria-label="新建对话"
              title="新建对话"
              onClick={() => {
                startNewChat();
                setMobileSidebarOpen(false);
              }}
            >
              <MessageSquarePlus className="h-4 w-4 shrink-0" />
              <span>新建对话</span>
            </Button>
            {/* 桌面端折叠按钮（移动端抽屉里不需要） */}
            <Button
              variant="ghost"
              size="icon"
              className="hidden h-9 w-9 shrink-0 text-muted-foreground lg:inline-flex"
              aria-label="收起会话列表"
              title="收起会话列表"
              onClick={() => setSidebarCollapsed(true)}
            >
              <PanelLeftClose className="h-4 w-4" />
            </Button>
            {/* 移动端关闭抽屉 */}
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0 text-muted-foreground lg:hidden"
              aria-label="关闭会话列表"
              onClick={() => setMobileSidebarOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <ScrollArea className="min-h-0 flex-1 [&>[data-radix-scroll-area-viewport]>div]:block!">
            <div className="p-2">
              {sessionsQuery.isLoading && (
                <div className="space-y-1.5 p-1">
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="h-9 animate-pulse rounded-lg bg-muted" />
                  ))}
                </div>
              )}

              {!sessionsQuery.isLoading && sessions.length === 0 && (
                <p className="px-2 py-6 text-center text-sm text-muted-foreground">暂无会话</p>
              )}

              {!sessionsQuery.isLoading &&
                groups.map((group) => (
                  <div key={group.label} className="mb-2">
                    <p className="px-2.5 py-1.5 text-[11px] font-medium tracking-wide text-muted-foreground/80">
                      {group.label}
                    </p>
                    <div className="space-y-0.5">
                      {group.items.map((s) => (
                        <SessionItem
                          key={s.id}
                          session={s}
                          activeId={activeId}
                          onActivate={() => {
                            stop();
                            setActiveId(s.id);
                            setMobileSidebarOpen(false);
                          }}
                          onDelete={() => deleteMutation.mutate(s.id)}
                          onRename={() => openRename(s)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          </ScrollArea>
        </aside>

        {/* ===== 对话区 ===== */}
        <section className="flex min-h-0 min-w-0 flex-1 flex-col">
          <header className="flex h-14 shrink-0 items-center gap-2 border-b px-3 sm:gap-3 sm:px-4">
            {/* 移动端：打开会话列表抽屉 */}
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0 text-muted-foreground lg:hidden"
              aria-label="打开会话列表"
              onClick={() => setMobileSidebarOpen(true)}
            >
              <Menu className="h-4 w-4" />
            </Button>

            {/* 桌面端侧栏收起后，把「新建对话 / 展开」搬到标题左侧 */}
            {sidebarCollapsed && (
              <div className="hidden shrink-0 items-center gap-1 lg:flex">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-muted-foreground"
                  aria-label="新建对话"
                  title="新建对话"
                  onClick={() => {
                    startNewChat();
                    setMobileSidebarOpen(false);
                  }}
                >
                  <MessageSquarePlus className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-muted-foreground"
                  aria-label="展开会话列表"
                  title="展开会话列表"
                  onClick={() => setSidebarCollapsed(false)}
                >
                  <PanelLeftOpen className="h-4 w-4" />
                </Button>
              </div>
            )}

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{activeSession?.title || "新对话"}</p>
              <p
                className={cn(
                  "truncate text-xs text-muted-foreground",
                  streaming && "text-primary/80",
                )}
              >
                {streaming ? status || "正在回复…" : "随时为你解答财务问题"}
              </p>
            </div>

            {activeSession && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 text-muted-foreground"
                    aria-label="会话操作"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuItem onClick={() => openRename(activeSession)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    重命名
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => deleteMutation.mutate(activeSession.id)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    删除会话
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </header>

          <Conversation overlay={<ConversationScrollButton />}>
            <ConversationContent className="flex min-h-full flex-col gap-7">
              {isEmpty && <EmptyState disabled={streaming} onPick={(text) => void send(text)} />}

              {historyLoading && (
                <div className="flex flex-col gap-3 py-6">
                  <div className="ml-auto h-9 w-2/5 animate-pulse rounded-2xl bg-muted" />
                  <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
                </div>
              )}

              {turns.map((turn, index) => (
                <TurnView
                  key={turn.key}
                  turn={turn}
                  streaming={streaming && index === turns.length - 1}
                />
              ))}
            </ConversationContent>

            <AutoScroll sessionKey={activeId} signal={scrollSignal} />
          </Conversation>

          <div className="shrink-0 border-t bg-card px-3 pb-2.5 pt-3 sm:px-4">
            <div className="mx-auto w-full max-w-3xl">
              <PromptInput
                onSubmit={(e) => {
                  e.preventDefault();
                  submit();
                }}
              >
                <PromptInputTextarea
                  textareaRef={inputRef}
                  value={input}
                  onValueChange={setInput}
                  onSubmit={submit}
                  placeholder="问点什么，比如「这个月我花在哪了」"
                />
                <PromptInputFooter>
                  <PromptInputHint className="hidden sm:block">
                    Enter 发送 · Shift + Enter 换行
                  </PromptInputHint>
                  <PromptInputHint className="sm:hidden">
                    AI 可能出错，请核实关键数据
                  </PromptInputHint>
                  <PromptInputSubmit streaming={streaming} disabled={!input.trim()} onStop={stop} />
                </PromptInputFooter>
              </PromptInput>
              <p className="mt-2 hidden text-center text-[11px] text-muted-foreground/70 sm:block">
                AI 可能出错，请核实关键数据
              </p>
            </div>
          </div>
        </section>
      </div>

      <Dialog open={!!renameTarget} onOpenChange={(open) => !open && setRenameTarget(null)}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>重命名会话</DialogTitle>
            <DialogDescription>请输入新的会话名称，最多 100 个字符。</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="session-title">会话名称</Label>
            <Input
              id="session-title"
              value={renameValue}
              maxLength={100}
              autoFocus
              onChange={(e) => setRenameValue(e.target.value)}
              onFocus={(e) => e.currentTarget.select()}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  submitRename();
                }
              }}
              placeholder="例如：2026 年收支分析"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameTarget(null)}>
              取消
            </Button>
            <Button
              onClick={submitRename}
              disabled={renameMutation.isPending || !renameValue.trim()}
            >
              {renameMutation.isPending ? "保存中…" : "保存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/**
 * 切换会话 / 发送消息时把视口拉到底部。
 *
 * 放在 `Conversation` 内部是因为它要拿 context 里的 `scrollToBottom`；
 * 平时的自动跟随由 `Conversation` 自己用 ResizeObserver 处理，
 * 这里只覆盖两种「必须强制到底」的场景：换了会话、刚发出新问题。
 */
function AutoScroll({ sessionKey, signal }: { sessionKey: string | null; signal: number }) {
  const { scrollToBottom } = useConversation();

  useEffect(() => {
    // 等一帧，让新会话的历史先挂载再滚，否则滚的是旧内容的高度
    const timer = window.setTimeout(() => scrollToBottom("auto"), 60);
    return () => window.clearTimeout(timer);
  }, [sessionKey, scrollToBottom]);

  useEffect(() => {
    if (!signal) return;
    scrollToBottom("smooth");
  }, [signal, scrollToBottom]);

  return null;
}

function TurnView({ turn, streaming }: { turn: Turn; streaming: boolean }) {
  return (
    <div className="flex flex-col gap-4">
      {turn.user && (
        <Message from="user" className="animate-in duration-300 fade-in-0 slide-in-from-bottom-1">
          <MessageContent from="user">{turn.user.content}</MessageContent>
        </Message>
      )}
      {(turn.assistant || turn.tools.length > 0) && (
        <AssistantTurn message={turn.assistant} tools={turn.tools} streaming={streaming} />
      )}
    </div>
  );
}

function AssistantTurn({
  message,
  tools,
  streaming,
}: {
  message?: ViewMessage;
  tools: ViewMessage[];
  streaming: boolean;
}) {
  const content = message?.content ?? "";
  const pending = !!message?.pending;
  const running = tools.some((t) => t.done === false);

  // 还在等第一个字：只显示思考指示器。一旦开始出正文，指示器就该让位，
  // 否则「正在思考」和已经写出来的答案会同时挂在屏幕上。
  const thinking = pending && !content && tools.length === 0;

  const names = useMemo(() => {
    // 模型可能对同一个工具调用多次（分别查不同年份），按名称归并计数，
    // 避免摘要出现「收支分析、收支分析、资产分析」这种重复串。
    const counts = new Map<string, number>();
    for (const tool of tools) {
      const name = tool.display_name || tool.tool_name || "工具";
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([name, count]) => (count > 1 ? `${name} ×${count}` : name))
      .join("、");
  }, [tools]);

  const lastToolId = tools[tools.length - 1]?.id;

  return (
    <Message from="assistant" className="animate-in duration-300 fade-in-0 slide-in-from-bottom-1">
      <MessageAvatar>
        <LogoMark className="h-4 w-4" />
      </MessageAvatar>

      <div className="min-w-0 flex-1 space-y-2.5">
        {thinking && (
          <Reasoning
            isStreaming
            startedAt={message?.thinkingStartedAt}
            className="animate-in duration-200 fade-in-0"
          />
        )}

        {tools.length === 1 && (
          // 只有一步时不再套折叠面板：摘要和明细说的是同一件事，
          // 展开反而多一次点击。直接当作一行 trace 展示。
          <Tool
            label={toolLabel(tools[0])}
            status={tools[0].done === false ? "active" : "complete"}
            isLast
          />
        )}

        {tools.length > 1 && (
          <ChainOfThought running={running}>
            <ChainOfThoughtHeader running={running}>
              {running ? `正在分析：${names}` : `已分析：${names}`}
            </ChainOfThoughtHeader>
            <ChainOfThoughtContent>
              {tools.map((tool) => (
                <Tool
                  key={tool.id}
                  label={toolLabel(tool)}
                  status={tool.done === false ? "active" : "complete"}
                  isLast={tool.id === lastToolId}
                />
              ))}
            </ChainOfThoughtContent>
          </ChainOfThought>
        )}

        {content ? (
          <Response content={content} isAnimating={pending} />
        ) : pending ? (
          // 还在等第一个字时只有思考指示器；工具还在跑时由那行工具的转圈表示，
          // 都不需要再叠一层 loading。只有「工具都跑完、正文还没开始流」才提示整理中。
          thinking || running ? null : (
            <Loader text="正在整理回答…" />
          )
        ) : message ? (
          <p className="text-sm text-muted-foreground italic">本次回答未生成内容，请重新提问。</p>
        ) : null}

        {content && !pending && (
          <Actions>
            <CopyAction text={content} />
            {typeof message?.tokenCount === "number" && message.tokenCount > 0 ? (
              <span className="tnum ml-1 text-[11px] text-muted-foreground/70">
                {formatTokens(message.tokenCount)}
              </span>
            ) : null}
          </Actions>
        )}

        {streaming && content ? (
          <span className="sr-only" role="status">
            正在生成回答
          </span>
        ) : null}
      </div>
    </Message>
  );
}

function CopyAction({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <Action
      label={copied ? "已复制" : "复制回答"}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1500);
        } catch {
          toast.error("复制失败");
        }
      }}
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      <span>{copied ? "已复制" : "复制"}</span>
    </Action>
  );
}

function EmptyState({ onPick, disabled }: { onPick: (text: string) => void; disabled?: boolean }) {
  return (
    <div className="my-auto flex flex-col items-center justify-center px-2 py-10 text-center sm:py-16">
      <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border bg-card shadow-soft">
        <span
          aria-hidden
          className="absolute inset-0 -z-10 rounded-2xl opacity-70 blur-xl"
          style={{
            background: "radial-gradient(circle, var(--color-primary) 0%, transparent 70%)",
          }}
        />
        <LogoMark className="h-7 w-7" />
      </div>
      <h2 className="mt-5 font-display text-lg font-semibold tracking-tight">
        你好，我是 Finora 财务助手
      </h2>
      <p className="mt-1.5 max-w-md text-sm text-muted-foreground">
        我能查账户、资产与现金流，也能解释数字背后的变化。从下面这些问题开始：
      </p>
      <Suggestions className="mt-6 max-w-xl">
        {SUGGESTIONS.map((text) => (
          <Suggestion key={text} disabled={disabled} onClick={() => onPick(text)}>
            {text}
          </Suggestion>
        ))}
      </Suggestions>
    </div>
  );
}

function SessionItem({
  session,
  activeId,
  onActivate,
  onDelete,
  onRename,
}: {
  session: ChatSession;
  activeId: string | null;
  onActivate: () => void;
  onDelete: () => void;
  onRename: () => void;
}) {
  const title = session.title || "未命名会话";
  const active = activeId === session.id;

  return (
    <div
      className={cn(
        "group relative flex w-full min-w-0 cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors",
        active
          ? "bg-primary/10 font-medium text-primary"
          : "text-foreground/80 hover:bg-muted hover:text-foreground",
      )}
      onClick={onActivate}
      title={title}
    >
      {active && (
        <span
          aria-hidden
          className="absolute top-1/2 left-0 h-4 w-0.5 -translate-y-1/2 rounded-full bg-primary"
        />
      )}
      <span className="min-w-0 flex-1 truncate">{title}</span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={cn(
              "flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity hover:bg-background hover:text-foreground group-hover:opacity-100 focus-visible:opacity-100",
              active && "opacity-100",
            )}
            aria-label="会话操作"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" side="right">
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              onRename();
            }}
          >
            <Pencil className="mr-2 h-4 w-4" />
            重命名
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            删除
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
