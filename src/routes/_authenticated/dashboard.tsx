import { createFileRoute } from "@tanstack/react-router";
import { ArrowUpRight, TrendingUp, TrendingDown, Wallet, CreditCard, PiggyBank, Target } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "财务概览 · NetWorthLens" },
      { name: "description", content: "你的净资产趋势、资产结构与目标进度一览。" },
    ],
  }),
  component: DashboardPage,
});

const trend = [
  { month: "1月", value: 182000 },
  { month: "2月", value: 195000 },
  { month: "3月", value: 188000 },
  { month: "4月", value: 210000 },
  { month: "5月", value: 224000 },
  { month: "6月", value: 246000 },
];

const allocation = [
  { name: "现金 / 活期", value: 38000, color: "var(--color-chart-2)" },
  { name: "基金 / 股票", value: 96000, color: "var(--color-chart-1)" },
  { name: "房产", value: 1200000, color: "var(--color-chart-3)" },
  { name: "其他", value: 24000, color: "var(--color-chart-4)" },
];

const goals = [
  { name: "应急金", target: 60000, current: 42000 },
  { name: "买房首付", target: 800000, current: 246000 },
  { name: "旅行基金", target: 30000, current: 18500 },
];

function fmtMoney(n: number) {
  return "¥" + n.toLocaleString("zh-CN");
}

function DashboardPage() {
  const netWorth = 1246800;
  const monthDelta = 22000;
  const monthDeltaPct = 1.8;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">你的净资产</p>
          <h1 className="font-display text-4xl sm:text-5xl font-semibold tracking-tight mt-1">
            {fmtMoney(netWorth)}
          </h1>
          <div className="flex items-center gap-2 mt-2 text-sm">
            <span className="inline-flex items-center gap-1 text-success font-medium">
              <ArrowUpRight className="h-4 w-4" />
              +{fmtMoney(monthDelta)} ({monthDeltaPct}%)
            </span>
            <span className="text-muted-foreground">较上月</span>
          </div>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={Wallet} label="总资产" value={fmtMoney(1358000)} delta="+2.4%" up />
        <KpiCard icon={CreditCard} label="总负债" value={fmtMoney(111200)} delta="-1.1%" up />
        <KpiCard icon={PiggyBank} label="本月现金流" value={fmtMoney(8400)} delta="+12%" up />
        <KpiCard icon={Target} label="目标完成度" value="38%" delta="3 个进行中" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Net worth trend */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="font-display">净资产趋势</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="nw" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="month" stroke="var(--color-muted-foreground)" fontSize={12} />
                  <YAxis stroke="var(--color-muted-foreground)" fontSize={12}
                    tickFormatter={(v) => `${v / 1000}k`} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--color-popover)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 8,
                    }}
                    formatter={(v: any) => fmtMoney(Number(v))}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="var(--color-primary)"
                    strokeWidth={2.5}
                    fill="url(#nw)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Allocation */}
        <Card>
          <CardHeader>
            <CardTitle className="font-display">资产结构</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={allocation}
                    dataKey="value"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={2}
                  >
                    {allocation.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    formatter={(v) => <span className="text-xs text-muted-foreground">{v}</span>}
                  />
                  <Tooltip formatter={(v: number) => fmtMoney(v)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Goals */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="font-display">财务目标</CardTitle>
          <span className="text-xs text-muted-foreground">3 个进行中</span>
        </CardHeader>
        <CardContent className="space-y-5">
          {goals.map((g) => {
            const pct = Math.round((g.current / g.target) * 100);
            return (
              <div key={g.name} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{g.name}</span>
                  <span className="text-muted-foreground tabular-nums">
                    {fmtMoney(g.current)} / {fmtMoney(g.target)}
                    <span className="ml-2 text-foreground font-medium">{pct}%</span>
                  </span>
                </div>
                <Progress value={pct} />
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  delta,
  up,
}: {
  icon: typeof Wallet;
  label: string;
  value: string;
  delta: string;
  up?: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{label}</span>
          <span className="h-8 w-8 rounded-lg bg-accent flex items-center justify-center text-primary">
            <Icon className="h-4 w-4" />
          </span>
        </div>
        <div className="mt-3 font-display text-2xl font-semibold tabular-nums">{value}</div>
        <div className="mt-1 text-xs flex items-center gap-1 text-muted-foreground">
          {up ? <TrendingUp className="h-3 w-3 text-success" /> : <TrendingDown className="h-3 w-3" />}
          {delta}
        </div>
      </CardContent>
    </Card>
  );
}
