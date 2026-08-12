import { API_BASE_URL, request, tokenStore } from "@/lib/api";

// ==================== 枚举 ====================

export enum AgentRole {
  USER = 1,
  ASSISTANT = 2,
  TOOL = 3,
  SYSTEM = 4,
}

export enum AIChatSessionStatus {
  NORMAL = 1,
  ARCHIVED = 2,
}

export enum ChatEventType {
  START = 1,
  STATUS = 2,
  TOOL_CALL = 3,
  TOOL_RESULT = 4,
  CONTENT = 5,
  FINISH = 6,
  ERROR = 7,
  THINKING = 8
}

// ==================== 类型 ====================

export interface ChatSession {
  id: string;
  title: string | null;
  status: AIChatSessionStatus;
  ctime: string;
}

export interface ChatMessage {
  id: string;
  role: AgentRole;
  content: string;
  tool_name: string | null;
  dispaly_name: string | null;
  token_count: number | null;
  model: string | null;
  ctime: string;
}

export interface CursorPage<T> {
  items?: T[];
  list?: T[];
  next_cursor?: string | null;
  has_more?: boolean;
}

export interface ChatStreamEvent {
  type: ChatEventType;
  data: Record<string, any>;
}

// ==================== REST ====================

export const chatApi = {
  sessions: () => request.get<ChatSession[]>("/v1/chat/sessions"),
  createSession: (title?: string | null) =>
    request.post<ChatSession>("/v1/chat/sessions", { title: title ?? null }),
  sessionDetail: (id: string) => request.get<ChatSession>(`/v1/chat/sessions/${id}`),
  deleteSession: (id: string) => request.delete<boolean>(`/v1/chat/sessions/${id}`),
  messages: (sessionId: string, params: { cursor?: string; size?: number } = {}) =>
    request.get<CursorPage<ChatMessage>>(`/v1/chat/sessions/${sessionId}/messages`, {
      params: { session_id: sessionId, ...params },
    }),
};

// ==================== SSE 流式聊天 ====================

export interface StreamChatHandlers {
  onEvent: (event: ChatStreamEvent) => void;
  onDone?: () => void;
  onError?: (err: Error) => void;
  signal?: AbortSignal;
}

export async function streamChat(
  payload: { session_id?: string | null; message: string },
  handlers: StreamChatHandlers,
) {
  const url = `${API_BASE_URL}/v1/chat/stream`;
  const token = tokenStore.get();

  try {
    const resp = await fetch(url, {
      method: "POST",
      credentials: "include",
      signal: handlers.signal,
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    });

    if (!resp.ok || !resp.body) {
      throw new Error(`请求失败 (${resp.status})`);
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const chunks = buffer.split("\n\n");
      buffer = chunks.pop() ?? "";

      for (const chunk of chunks) {
        const lines = chunk.split("\n");
        let dataLine = "";
        let eventName = "";
        for (const line of lines) {
          if (line.startsWith("data:")) dataLine += line.slice(5).trim();
          else if (line.startsWith("event:")) eventName = line.slice(6).trim();
        }
        if (eventName === "done" || dataLine === "[DONE]") {
          handlers.onDone?.();
          return;
        }
        if (!dataLine) continue;
        try {
          handlers.onEvent(JSON.parse(dataLine) as ChatStreamEvent);
        } catch {
          // 忽略无法解析的片段
        }
      }
    }

    handlers.onDone?.();
  } catch (err) {
    if ((err as Error)?.name === "AbortError") return;
    handlers.onError?.(err as Error);
  }
}
