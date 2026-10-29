import { API_BASE_URL, authApi, request, tokenStore } from "@/lib/api";

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
  THINKING = 8,
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
  /** 后端 AIChatMessageSchema 的字段名是 tool_name，没有 display_name */
  display_name?: string | null;
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
  renameSession: (id: string, title: string) =>
    request.put<ChatSession>(`/v1/chat/sessions/${id}`, { title }),
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
  /** 用户主动停止：与 onDone 分开，便于 UI 区分「正常结束」和「被打断」 */
  onAbort?: () => void;
  onError?: (err: Error) => void;
  signal?: AbortSignal;
}

export async function streamChat(
  payload: { session_id?: string | null; message: string },
  handlers: StreamChatHandlers,
) {
  const url = `${API_BASE_URL}/v1/chat/stream`;

  const send = () => {
    const token = tokenStore.get();
    return fetch(url, {
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
  };

  try {
    let resp = await send();

    // access token 过期时先刷新再重试一次，与 request 封装里的行为保持一致，
    // 否则流式接口在登录态刚过期时只会弹一个「请求失败 (401)」。
    if (resp.status === 401) {
      try {
        await authApi.refresh();
      } catch {
        tokenStore.clear("登录已过期，请重新登录");
        throw new Error("登录已过期，请重新登录");
      }
      resp = await send();
    }

    if (!resp.ok || !resp.body) {
      if (resp.status === 401) {
        tokenStore.clear("登录已过期，请重新登录");
        throw new Error("登录已过期，请重新登录");
      }
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
    // 主动中断不是错误：必须回调出去，否则调用方的 loading / pending
    // 状态没有任何机会被清理，界面会一直停在「正在回复」。
    if ((err as Error)?.name === "AbortError") {
      handlers.onAbort?.();
      return;
    }
    handlers.onError?.(err as Error);
  }
}
