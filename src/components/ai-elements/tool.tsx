import { Wrench } from "lucide-react";

import {
  ChainOfThoughtStep,
  type ChainOfThoughtStatus,
} from "@/components/ai-elements/chain-of-thought";

/**
 * 一次工具调用。
 *
 * 与 shadcn AI Elements 的 `Tool` 对应，但在本项目里刻意做成**只有一行**：
 *
 * - 参数（`arguments`）不展示。后端已经把它们渲染成一句人话
 *   （「分析收支情况（按年，近 12 期）」），把 `{"granularity":"year"}` 摊给用户
 *   没有任何意义 —— 这是项目既有约定（`app/services/agent/tool_display.py`）。
 * - 输出也不展示。工具返回的是财务数据明细，这些数字已经体现在最终回答里，
 *   再列一遍只会让回答变长。
 *
 * 所以这里只保留「调用了什么 + 跑完没有」，作为 Chain of Thought 里的一步。
 */
export function Tool({
  label,
  description,
  status = "complete",
  isLast = false,
}: {
  /** 后端渲染好的人话描述 */
  label: string;
  description?: string;
  status?: ChainOfThoughtStatus;
  isLast?: boolean;
}) {
  return (
    <ChainOfThoughtStep
      icon={<Wrench className="h-2.5 w-2.5" />}
      label={label}
      description={description}
      status={status}
      isLast={isLast}
    />
  );
}
