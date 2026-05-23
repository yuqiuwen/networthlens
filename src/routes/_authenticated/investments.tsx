import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/investments")({
  head: () => ({ meta: [{ title: "投资持仓 · NetWorthLens" }] }),
  component: () => (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-semibold">投资持仓</h1>
      <Card>
        <CardHeader><CardTitle>即将上线</CardTitle></CardHeader>
        <CardContent className="text-muted-foreground">
          基金 / 股票持仓，成本、市值、收益率统一视图。
        </CardContent>
      </Card>
    </div>
  ),
});
