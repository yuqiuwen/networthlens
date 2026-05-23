import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/transactions")({
  head: () => ({ meta: [{ title: "现金流 · NetWorthLens" }] }),
  component: () => (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-semibold">现金流</h1>
      <Card>
        <CardHeader><CardTitle>即将上线</CardTitle></CardHeader>
        <CardContent className="text-muted-foreground">
          收支流水、分类分析、月度结余趋势。
        </CardContent>
      </Card>
    </div>
  ),
});
