import { cjk } from "@streamdown/cjk";
import { code } from "@streamdown/code";
import { math } from "@streamdown/math";
import { mermaid } from "@streamdown/mermaid";
import { Streamdown } from "streamdown";

import { cn } from "@/lib/utils";

/**
 * AI 回答的 Markdown 渲染。
 *
 * 与 shadcn AI Elements 的 `Response` 对应。这里没有另起一套 Markdown 解析，
 * 而是把项目里已有的 Streamdown（代码高亮 / 表格 / 数学公式 / Mermaid / 中文换行）
 * 包一层排版约定：回答里出现最多的元素是标题、列表和表格，逐个给字号与间距。
 */
export function Response({
  content,
  isAnimating = false,
  className,
}: {
  content: string;
  /** 流式过程中才播放入场动画 */
  isAnimating?: boolean;
  className?: string;
}) {
  return (
    <Streamdown
      className={cn(
        // nwl-response 是给 styles.css 里的覆盖规则用的锚点：Streamdown 的
        // 代码块 / 表格底板用了 --sidebar，在本主题里是深色导航色，需要单独改。
        "nwl-response space-y-3 text-sm leading-relaxed",
        // 标题：回答内部最多到 h3，字号收在正文附近，靠字重拉层级
        "[&_h1]:text-base [&_h1]:font-semibold [&_h1]:tracking-tight",
        "[&_h2]:mt-5 [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:tracking-tight",
        "[&_h3]:mt-4 [&_h3]:text-sm [&_h3]:font-semibold",
        "[&_p]:leading-relaxed",
        "[&_a]:font-medium [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2",
        "[&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5",
        "[&_ol]:list-decimal [&_ol]:space-y-1 [&_ol]:pl-5",
        "[&_li]:pl-0.5 [&_li::marker]:text-muted-foreground",
        "[&_strong]:font-semibold [&_strong]:text-foreground",
        "[&_hr]:my-5 [&_hr]:border-border",
        "[&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground",
        // 表格：回答里对比类问题基本都以表格收尾，必须能横向滚动而不是撑破气泡
        "[&_table]:my-1 [&_table]:w-full [&_table]:text-xs",
        "[&_th]:border [&_th]:bg-muted/60 [&_th]:px-2.5 [&_th]:py-1.5 [&_th]:text-left [&_th]:font-medium",
        "[&_td]:border [&_td]:px-2.5 [&_td]:py-1.5",
        "[&_pre]:rounded-xl [&_pre]:border",
        className,
      )}
      shikiTheme={["github-light", "github-dark"]}
      // 只在流式过程中播放入场动画。消息列表在历史同步时会被整体替换、
      // 组件重挂载，若这里恒为 true，回答结束后会再重播一次动画。
      animated={isAnimating}
      isAnimating={isAnimating}
      plugins={{ code, mermaid, math, cjk }}
    >
      {content}
    </Streamdown>
  );
}
