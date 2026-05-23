import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/goals")({
  head: () => ({ meta: [{ title: "财务目标 · NetWorthLens" }] }),
  component: () => (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-semibold">财务目标</h1>
      <Card>
        <CardHeader><CardTitle>即将上线</CardTitle></CardHeader>
        <CardContent className="text-muted-foreground">
          建立买房首付、应急金、旅行基金等目标，联动实际资产追踪达成进度。
        </CardContent>
      </Card>
    </div>
  ),
});
