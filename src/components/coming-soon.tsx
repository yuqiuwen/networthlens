import { Link } from "@tanstack/react-router";
import { ArrowRight, Check, Sparkles, type LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type ComingSoonProps = {
  /** 页面主图标 */
  icon: LucideIcon;
  /** 页面标题，与导航项文案保持一致 */
  title: string;
  /** 一句话说明这个模块要解决什么问题 */
  description: string;
  /** 规划中的能力清单 */
  highlights: string[];
  /** 今天就能在 AI 助手里问到的替代路径 */
  aiHint: string;
};

/**
 * 尚未上线的模块统一占位页。
 *
 * 设计约定：
 * - 与已上线页面保持同一套标题排版（font-display text-3xl + mt-1 描述）
 * - 明确标注「开发中」，不暗示已具备能力
 * - 提供一条今天就能走通的替代路径（AI 助手），避免死路
 */
export function ComingSoon({
  icon: Icon,
  title,
  description,
  highlights,
  aiHint,
}: ComingSoonProps) {
  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="font-display text-3xl font-semibold">{title}</h1>
          <Badge variant="secondary" className="rounded-full font-medium">
            开发中
          </Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>

      <Card className="border-dashed shadow-none">
        <CardContent className="flex flex-col items-center px-6 py-12 text-center sm:px-10">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Icon className="h-8 w-8" aria-hidden="true" />
          </div>

          <p className="mt-5 max-w-xl text-sm text-muted-foreground">
            该模块正在开发中。规划中的能力包括：
          </p>

          <ul className="mt-4 grid w-full max-w-2xl gap-2 text-left sm:grid-cols-2">
            {highlights.map((item) => (
              <li
                key={item}
                className="flex items-start gap-2 rounded-lg bg-muted/50 px-3 py-2 text-sm text-muted-foreground"
              >
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                <span>{item}</span>
              </li>
            ))}
          </ul>

          <div className="mt-8 flex w-full max-w-2xl flex-col items-center gap-3 border-t pt-6">
            <p className="flex items-start gap-2 text-sm text-muted-foreground">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-gold" aria-hidden="true" />
              <span>{aiHint}</span>
            </p>
            <Button asChild variant="outline" size="sm">
              <Link to="/assistant">
                去问 AI 助手
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
