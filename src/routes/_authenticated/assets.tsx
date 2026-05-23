import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/assets")({
  head: () => ({ meta: [{ title: "资产 / 负债 · NetWorthLens" }] }),
  component: () => (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-semibold">资产 / 负债</h1>
      <Card>
        <CardHeader><CardTitle>即将上线</CardTitle></CardHeader>
        <CardContent className="text-muted-foreground">
          录入银行卡、现金、基金、股票、房产、贷款、信用卡等条目，自动汇总净资产。
        </CardContent>
      </Card>
    </div>
  ),
});
