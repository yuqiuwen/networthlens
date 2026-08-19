import { Wallet } from "lucide-react";

import { cn } from "@/lib/utils";

/** 小图形式展示账户自定义 SVG 图标，无图标时回退到默认钱包图标 */
export function AccountIcon({
  svg,
  className,
}: {
  svg?: string | null;
  className?: string;
}) {
  const markup = svg?.trim();

  if (markup) {
    return (
      <img
        src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`}
        alt=""
        aria-hidden
        className={cn(
          "h-5 w-5 shrink-0 rounded-[4px] bg-muted object-cover",
          className,
        )}
      />
    );
  }

  return (
    <span
      className={cn(
        "grid h-5 w-5 shrink-0 place-items-center rounded-[4px] bg-muted text-muted-foreground",
        className,
      )}
    >
      <Wallet className="h-3 w-3" />
    </span>
  );
}
