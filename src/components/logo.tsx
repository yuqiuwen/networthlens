import { cn } from "@/lib/utils";

/**
 * Finora 品牌标识
 *
 * 设计概念：**被一道光切开的 F**
 * 两条 Γ 形粗笔画叠成字母 F，被一段大半径圆弧斜切成上下两半 ——
 * 上半是品牌青绿（teal），下半是深藏青（navy）。
 * 那道斜切既是「焦点」也是「分界」：把过去与未来分开，呼应 Slogan
 * "Your Wealth, In Focus."。
 *
 * 几何来源：下面两个 path 的坐标不是手画的，是从设计稿参考图逐像素反推出来的 ——
 * 逐个圆弧的圆心与半径都由实测边界点做圆拟合得到（外转角 R43.1、内转角 R20.4、
 * 臂端 R24.1、斜切 R41.1 等），拟合后与参考图的像素分类一致率 98.1%。
 * 因此**不要凭感觉改这些数字**，改动前先跑一遍像素比对。
 */

/** 品牌主色。teal 是标识恒定色，navy 只用于浅色底。 */
export const BRAND = {
  /** 品牌青绿，取自参考图众数色 */
  teal: "#1FB4A1",
  /** 品牌深藏青，取自参考图众数色 */
  navy: "#151B33",
} as const;

/** F 的上半：Γ 形笔画，右上留大圆角，臂端为斜切弧 */
const MARK_TOP_PATH =
  "M 0 43.1 A 43.1 43.1 0 0 1 43.1 0 L 100.07 0 A 24.1 24.1 0 0 1 79.73 22.7 " +
  "L 41.1 22.7 A 20.4 20.4 0 0 0 22.73 43.1 A 41.1 41.1 0 0 0 0 61.0 Z";

/** F 的下半：与上半同构、向左下平移，臂更短（正是 F 中横比上横短的特征） */
const MARK_BOTTOM_PATH =
  "M 30.34 47.37 L 77.7 47.37 A 23.2 23.2 0 0 1 59.29 70.07 L 31.09 70.07 " +
  "A 13.7 13.7 0 0 0 22.73 81.81 L 22.73 94.5 A 22.1 22.1 0 0 1 0 116.59 " +
  "L 0 81.46 A 37.5 37.5 0 0 1 30.34 47.37 Z";

/** 标记自身的长宽比（100.1 × 116.6），字标与图标排版时要用 */
export const MARK_RATIO = 100.1 / 116.6;

type LogoTone = "onDark" | "onLight";

/**
 * 两半的配色。
 * - 浅色底：青绿 + 藏青，就是标识本来的样子。
 * - 深色底：藏青会糊进背景，下半改用 `currentColor`（由调用方给的文字色决定），
 *   上半保持品牌青绿，这样在深色侧边栏上仍然能读出「上面亮、下面浅」的双色结构。
 */
const MARK_FILL: Record<LogoTone, { top: string; bottom: string }> = {
  onLight: { top: BRAND.teal, bottom: BRAND.navy },
  onDark: { top: BRAND.teal, bottom: "currentColor" },
};

/**
 * 浏览器标签页图标。
 *
 * 独立 SVG 拿不到页面 CSS 变量，所以这里把品牌色写死。用白色圆角底 + 全彩标记：
 * 标签栏底色深浅不定，白色底能保证标记永远以正确的青绿 + 藏青出现。
 */
export const FAVICON_DATA_URI = `data:image/svg+xml,${encodeURIComponent(
  [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">',
    '<rect width="120" height="120" rx="26" fill="#FFFFFF"/>',
    '<g transform="translate(18.8 12) scale(0.823)">',
    `<path fill="${BRAND.teal}" d="${MARK_TOP_PATH}"/>`,
    `<path fill="${BRAND.navy}" d="${MARK_BOTTOM_PATH}"/>`,
    "</g></svg>",
  ].join(""),
)}`;

interface LogoMarkProps {
  className?: string;
  /** 无障碍标题 */
  title?: string;
  tone?: LogoTone;
}

/**
 * 纯图形标识（不含文字）。
 *
 * viewBox 保留标记自身的比例（100.1 × 116.6，比 1 窄），
 * 放进方形容器时由 `preserveAspectRatio` 自动留白居中，不会被拉变形 ——
 * 所以调用方继续写 `h-8 w-8` 就行，不需要改成 `w-auto`。
 */
export function LogoMark({ className, title = "Finora", tone = "onLight" }: LogoMarkProps) {
  const fill = MARK_FILL[tone];

  return (
    <svg
      viewBox="0 0 100.1 116.6"
      role="img"
      aria-label={title}
      className={cn("h-8 w-8", className)}
    >
      <path d={MARK_TOP_PATH} fill={fill.top} />
      <path d={MARK_BOTTOM_PATH} fill={fill.bottom} />
    </svg>
  );
}

const TONE_CLASS: Record<LogoTone, { word: string; sub: string }> = {
  onDark: { word: "text-sidebar-foreground", sub: "text-sidebar-foreground/60" },
  onLight: { word: "text-foreground", sub: "text-muted-foreground" },
};

interface LogoProps {
  className?: string;
  markClassName?: string;
  wordmarkClassName?: string;
  subtitle?: string;
  subtitleClassName?: string;
  tone?: LogoTone;
  /** 是否显示文字，false 时只渲染图形标识 */
  showWordmark?: boolean;
}

/**
 * 完整标识：图形 + Finora 字标（可带副标题）。
 *
 * 品牌**不使用中文名**，字标恒为 "Finora"；需要说明语时用 Slogan
 * "Your Wealth, In Focus." 或功能描述，不要另外造中文名。
 */
export function Logo({
  className,
  markClassName,
  wordmarkClassName,
  subtitle,
  subtitleClassName,
  tone = "onLight",
  showWordmark = true,
}: LogoProps) {
  const t = TONE_CLASS[tone];

  if (!showWordmark) {
    return <LogoMark className={cn(t.word, markClassName, className)} tone={tone} />;
  }

  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark className={cn("shrink-0", t.word, markClassName)} tone={tone} />
      <span className="flex min-w-0 flex-col">
        <span
          className={cn(
            // 字标用 Inter 半粗 + 收紧字距，贴近设计稿里几何无衬线的观感。
            // 以前这里是金色渐变，换成品牌单色后不再需要 text-gradient-gold。
            "font-display text-lg leading-none font-semibold tracking-[-0.03em]",
            t.word,
            wordmarkClassName,
          )}
        >
          Finora
        </span>
        {subtitle ? (
          <span className={cn("mt-1 text-xs leading-none", t.sub, subtitleClassName)}>
            {subtitle}
          </span>
        ) : null}
      </span>
    </span>
  );
}
