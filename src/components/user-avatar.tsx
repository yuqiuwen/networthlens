import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

/**
 * 取用户名首字作为头像兜底文字。
 *
 * 用 `Array.from` 按码点切分而不是 `name[0]`：中文姓氏、emoji 之类都可能是
 * 代理对，用下标切会切出半个字符（渲染成 ``）。
 */
function avatarInitial(name?: string | null): string {
  const trimmed = name?.trim();
  if (!trimmed) return "U";
  return (Array.from(trimmed)[0] ?? "U").toUpperCase();
}

/**
 * 底色语境，与 `Logo` 的 `tone` 保持一致。
 *
 * 侧边栏是深色底，`bg-primary/15 text-primary` 那种浅色底上的配色搬过去
 * 会变成「深色字压深色圆」，对比度极低 —— 所以要按语境换一套变量。
 */
type AvatarTone = "onLight" | "onDark";

const TONE_CLASS: Record<AvatarTone, string> = {
  onLight: "bg-primary/15 text-primary",
  onDark: "bg-sidebar-foreground/15 text-sidebar-foreground",
};

/**
 * 用户头像：有头像地址就显示图片，否则回退到用户名首字母。
 *
 * 回退逻辑交给 Radix 的 `AvatarImage` —— 它在图片**加载成功前不渲染
 * `<img>`**，加载失败也保持不渲染，于是 `AvatarFallback` 自然顶上来。
 * 因此 `avatar` 存的是无效地址（历史数据里就有 `"xx"` 这种）或图片 404 时，
 * 不需要我们自己监听 `onError`，都会优雅地退回首字母。
 *
 * ⚠️ 注意这里**无条件渲染 `AvatarImage`**，不要在 `url` 为空时把它摘掉：
 * Radix 的 `Avatar` 根节点用 `imageLoadingStatus` 状态决定 fallback 是否可见，
 * 而 `AvatarImage` 卸载时**不会**把状态重置回 `idle`。一旦图片加载成功过
 * （状态变成 `loaded`），再把 `AvatarImage` 从树上摘掉，fallback 就永远渲染不出来，
 * 页面上会留下一个空圆圈。把 `src` 传空让 Radix 自己把状态判成 `error` 才是对的。
 */
export function UserAvatar({
  name,
  src,
  className,
  textClassName,
  tone = "onLight",
}: {
  /** 用于生成首字母兜底文字 */
  name?: string | null;
  /** 头像地址；空值（undefined / null / 空串）时直接走首字母 */
  src?: string | null;
  /** 控制头像尺寸，如 "h-8 w-8" */
  className?: string;
  /** 控制首字母字号，需随 `className` 的尺寸一起调整 */
  textClassName?: string;
  tone?: AvatarTone;
}) {
  return (
    <Avatar className={cn("h-10 w-10", className)}>
      {/* alt 留空：头像旁边的文案（用户名）已经承担了语义，
          让读屏软件再念一遍图片描述只会造成重复。 */}
      <AvatarImage src={src?.trim() || undefined} alt="" />
      <AvatarFallback className={cn("font-semibold", TONE_CLASS[tone], textClassName)}>
        {avatarInitial(name)}
      </AvatarFallback>
    </Avatar>
  );
}
