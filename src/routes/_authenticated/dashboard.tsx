import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Wallet,
  CreditCard,
  PiggyBank,
  Landmark,
  Sparkles,
  Boxes,
  CalendarRange,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { statsApi, type DashboardPeriod } from "@/lib/api/stats";
import { AccountTypeOptions } from "@/lib/constant";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
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
      { name: "description", content: "你的净资产趋势、资产结构与收支洞察一览。" },
      { property: "og:title", content: "财务概览 · NetWorthLens" },
      { property: "og:description", content: "净资产趋势、现金流、消费分类与账户资产分布。" },
    ],
  }),
  component: DashboardPage,
});

const PERIODS: { label: string; value: DashboardPeriod }[] = [
  { label: "本月", value: "month" },
  { label: "本季", value: "quarter" },
  { label: "本年", value: "year" },
];

const CHART_COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
];

function num(v: unknown) {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function fmtMoney(v: unknown) {
  return "¥" + num(v).toLocaleString("zh-CN", { maximumFractionDigits: 2 });
}

function fmtCompact(v: number) {
  const abs = Math.abs(v);
  if (abs >= 1_0000_0000) return (v / 1_0000_0000).toFixed(1) + "亿";
  if (abs >= 1_0000) return (v / 1_0000).toFixed(1) + "万";
  return String(Math.round(v));
}

function fmtPct(v: unknown) {
  if (v === null || v === undefined) return "—";
  return (num(v) * 100).toFixed(1) + "%";
}

function fmtDate(d: string) {
  if (!d) return "";
  const parts = d.split("-");
  if (parts.length < 3) return d;
  return `${Number(parts[1])}/${Number(parts[2])}`;
}

const tooltipStyle = {
  background: "var(--color-popover)",
  border: "1px solid var(--color-border)",
  borderRadius: 8,
  fontSize: 12,
} as const;

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function DashboardPage() {
  const now = new Date();
  const [period, setPeriod] = useState<DashboardPeriod>("month");
  const [custom, setCustom] = useState(false);
  const [year, setYear] = useState(now.getFullYear());
  const [quarter, setQuarter] = useState(Math.floor(now.getMonth() / 3) + 1);
  const [month, setMonth] = useState(now.getMonth() + 1);

  const years = Array.from({ length: 8 }, (_, i) => now.getFullYear() - i);

  const queryDate = !custom
    ? undefined
    : period === "year"
      ? `${year}-01-01`
      : period === "quarter"
        ? `${year}-${pad2((quarter - 1) * 3 + 1)}-01`
        : `${year}-${pad2(month)}-01`;

  const q = { period, ...(queryDate ? { query_date: queryDate } : {}) };
  const key = [period, queryDate ?? "current"];

  const metricsQ = useQuery({ queryKey: ["stats", "metrics", ...key], queryFn: () => statsApi.metrics(q) });
  const cashFlowQ = useQuery({ queryKey: ["stats", "cash-flow", ...key], queryFn: () => statsApi.cashFlow(q) });
  const expenseQ = useQuery({
    queryKey: ["stats", "expense-category", ...key],
    queryFn: () => statsApi.expenseCategory(q),
  });
  const accountQ = useQuery({ queryKey: ["stats", "accounts"], queryFn: () => statsApi.accountStats() });
  const assetQ = useQuery({ queryKey: ["stats", "assets", ...key], queryFn: () => statsApi.assetCategoryStats(q) });
  const wealthQ = useQuery({ queryKey: ["stats", "wealth-trend", ...key], queryFn: () => statsApi.wealthTrend(q) });

  const m = metricsQ.data;
  const periodLabel = custom
    ? period === "year"
      ? `${year}年`
      : period === "quarter"
        ? `${year}年Q${quarter}`
        : `${year}年${month}月`
    : (PERIODS.find((p) => p.value === period)?.label ?? "本月");


  const cashFlow = (cashFlowQ.data?.items ?? []).map((it) => ({
    ...it,
    label: fmtDate(it.bucket_date),
    income: num(it.income),
    expense: num(it.expense),
    balance: num(it.balance),
  }));

  const expenseItems = (expenseQ.data?.items ?? []).map((it) => ({
    ...it,
    amount: num(it.amount),
  }));

  const wealth = (wealthQ.data?.items ?? []).map((it) => ({
    label: fmtDate(it.bucket_date),
    account_value: num(it.account_value),
    asset_value: num(it.asset_value),
    total_assets: num(it.total_assets),
  }));

  return (
    <div className="space-y-8">
      {/* 第一屏 */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">总资产</p>
          {metricsQ.isLoading ? (
            <Skeleton className="mt-2 h-12 w-64" />
          ) : (
            <h1 className="font-display text-4xl sm:text-5xl font-semibold tracking-tight mt-1 tabular-nums">
              {fmtMoney(m?.total_assets)}
            </h1>
          )}
          <div className="flex items-center gap-2 mt-2 text-sm">
            <ChangeBadge value={m?.total_assets_change} rate={m?.total_assets_change_rate} />
            <span className="text-muted-foreground">较上一周期</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Tabs value={period} onValueChange={(v) => setPeriod(v as DashboardPeriod)}>
            <TabsList>
              {PERIODS.map((p) => (
                <TabsTrigger key={p.value} value={p.value}>
                  {p.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <Button
            variant={custom ? "default" : "outline"}
            size="sm"
            onClick={() => setCustom((c) => !c)}
          >
            <CalendarRange className="h-4 w-4" />
            自定义
          </Button>

          {custom && (
            <>
              <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
                <SelectTrigger className="w-[110px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y} 年
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {period === "quarter" && (
                <Select value={String(quarter)} onValueChange={(v) => setQuarter(Number(v))}>
                  <SelectTrigger className="w-[100px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4].map((qq) => (
                      <SelectItem key={qq} value={String(qq)}>
                        第 {qq} 季度
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {period === "month" && (
                <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
                  <SelectTrigger className="w-[100px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((mm) => (
                      <SelectItem key={mm} value={String(mm)}>
                        {mm} 月
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </>
          )}
        </div>

      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard
          icon={Wallet}
          label="总资产"
          value={fmtMoney(m?.total_assets)}
          change={m?.total_assets_change}
          rate={m?.total_assets_change_rate}
          loading={metricsQ.isLoading}
        />
        <KpiCard
          icon={Landmark}
          label="可用资金"
          value={fmtMoney(m?.available_funds)}
          loading={metricsQ.isLoading}
        />
        <KpiCard
          icon={PiggyBank}
          label={`${periodLabel}收入`}
          value={fmtMoney(m?.income)}
          change={m?.income_change}
          rate={m?.income_change_rate}
          loading={metricsQ.isLoading}
        />
        <KpiCard
          icon={CreditCard}
          label={`${periodLabel}支出`}
          value={fmtMoney(m?.expense)}
          change={m?.expense_change}
          rate={m?.expense_change_rate}
          invert
          loading={metricsQ.isLoading}
        />
        <KpiCard
          icon={Sparkles}
          label={`${periodLabel}结余`}
          value={fmtMoney(m?.balance)}
          change={m?.balance_change}
          hint={m?.saving_rate != null ? `储蓄率 ${fmtPct(m.saving_rate)}` : undefined}
          loading={metricsQ.isLoading}
        />
      </div>

      {/* 第二屏 */}
      <div className="grid lg:grid-cols-5 gap-6">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="font-display">收支趋势</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartFrame loading={cashFlowQ.isLoading} empty={cashFlow.length === 0}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cashFlow} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                  <CartesianGrid stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="label" stroke="var(--color-muted-foreground)" fontSize={12} />
                  <YAxis
                    stroke="var(--color-muted-foreground)"
                    fontSize={12}
                    tickFormatter={(v: any) => fmtCompact(Number(v))}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(v: any, name: any) => [
                      fmtMoney(v),
                      name === "income" ? "收入" : name === "expense" ? "支出" : "结余",
                    ]}
                  />
                  <Legend
                    iconType="circle"
                    formatter={(v: any) => (
                      <span className="text-xs text-muted-foreground">
                        {v === "income" ? "收入" : v === "expense" ? "支出" : "结余"}
                      </span>
                    )}
                  />
                  <Bar dataKey="income" fill="var(--color-chart-2)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expense" fill="var(--color-chart-4)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartFrame>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="font-display">消费分类</CardTitle>
            <span className="text-xs text-muted-foreground tabular-nums">
              合计 {fmtMoney(expenseQ.data?.total)}
            </span>
          </CardHeader>
          <CardContent>
            <ChartFrame loading={expenseQ.isLoading} empty={expenseItems.length === 0}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={expenseItems} dataKey="amount" nameKey="category_name" innerRadius={55} outerRadius={90} paddingAngle={2}>
                    {expenseItems.map((entry, i) => (
                      <Cell key={entry.category_id ?? entry.category_name ?? i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    formatter={(v: any) => <span className="text-xs text-muted-foreground">{v}</span>}
                  />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => fmtMoney(v)} />
                </PieChart>
              </ResponsiveContainer>
            </ChartFrame>

            {expenseItems.length > 0 && (
              <div className="mt-4 space-y-3">
                {expenseItems.slice(0, 5).map((it, i) => (
                  <div key={it.category_id ?? it.category_name ?? i} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}
                        />
                        {it.category_name}
                        <span className="text-xs text-muted-foreground">{it.transaction_count} 笔</span>
                      </span>
                      <span className="tabular-nums text-muted-foreground">
                        {fmtMoney(it.amount)}
                        <span className="ml-2 text-foreground">{fmtPct(it.percentage)}</span>
                      </span>
                    </div>
                    <Progress value={Math.min(100, num(it.percentage) * 100)} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 第三屏 */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="font-display">资金账户</CardTitle>
            <span className="text-xs text-muted-foreground tabular-nums">
              合计 {fmtMoney(accountQ.data?.total)}
            </span>
          </CardHeader>
          <CardContent className="space-y-4">
            {accountQ.isLoading ? (
              <ListSkeleton />
            ) : (accountQ.data?.items ?? []).length === 0 ? (
              <EmptyText text="暂无账户数据" />
            ) : (
              accountQ.data!.items.map((it, i) => (
                <DistributionRow
                  key={it.id}
                  color={CHART_COLORS[i % CHART_COLORS.length]}
                  title={it.name}
                  subtitle={AccountTypeOptions.find((o) => o.value === it.type)?.label ?? "账户"}
                  amount={num(it.balance)}
                  percentage={num(it.percentage)}
                />
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="font-display">个人资产</CardTitle>
            <span className="text-xs text-muted-foreground tabular-nums">
              合计 {fmtMoney(assetQ.data?.total)}
            </span>
          </CardHeader>
          <CardContent className="space-y-4">
            {assetQ.isLoading ? (
              <ListSkeleton />
            ) : (assetQ.data?.items ?? []).length === 0 ? (
              <EmptyText text="暂无资产数据" />
            ) : (
              assetQ.data!.items.map((it, i) => (
                <DistributionRow
                  key={it.category_id ?? it.category_name ?? i}
                  color={CHART_COLORS[(i + 2) % CHART_COLORS.length]}
                  title={it.category_name}
                  subtitle={`${it.asset_count} 项资产`}
                  amount={num(it.value)}
                  percentage={num(it.percentage)}
                />
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* 第四屏 */}
      <Card>
        <CardHeader>
          <CardTitle className="font-display">个人财富趋势</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartFrame loading={wealthQ.isLoading} empty={wealth.length === 0} height="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={wealth} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                <defs>
                  <linearGradient id="nw-total" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="label" stroke="var(--color-muted-foreground)" fontSize={12} />
                <YAxis
                  stroke="var(--color-muted-foreground)"
                  fontSize={12}
                  tickFormatter={(v: any) => fmtCompact(Number(v))}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v: any, name: any) => [
                    fmtMoney(v),
                    name === "total_assets" ? "总资产" : name === "account_value" ? "资金账户" : "非资金资产",
                  ]}
                />
                <Legend
                  iconType="circle"
                  formatter={(v: any) => (
                    <span className="text-xs text-muted-foreground">
                      {v === "total_assets" ? "总资产" : v === "account_value" ? "资金账户" : "非资金资产"}
                    </span>
                  )}
                />
                <Area
                  type="monotone"
                  dataKey="total_assets"
                  stroke="var(--color-primary)"
                  strokeWidth={2.5}
                  fill="url(#nw-total)"
                />
                <Area
                  type="monotone"
                  dataKey="account_value"
                  stroke="var(--color-chart-2)"
                  strokeWidth={1.5}
                  fillOpacity={0}
                />
                <Area
                  type="monotone"
                  dataKey="asset_value"
                  stroke="var(--color-chart-3)"
                  strokeWidth={1.5}
                  fillOpacity={0}
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartFrame>
        </CardContent>
      </Card>

      {/* 第五屏 */}
      <Card>
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            AI 财务洞察
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
            <Boxes className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">AI 洞察即将上线，敬请期待。</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ChartFrame({
  loading,
  empty,
  height = "h-72",
  children,
}: {
  loading?: boolean;
  empty?: boolean;
  height?: string;
  children: React.ReactNode;
}) {
  if (loading) return <Skeleton className={`${height} w-full`} />;
  if (empty)
    return (
      <div className={`${height} flex items-center justify-center text-sm text-muted-foreground`}>
        暂无数据
      </div>
    );
  return <div className={height}>{children}</div>;
}

function ListSkeleton() {
  return (
    <div className="space-y-4">
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  );
}

function EmptyText({ text }: { text: string }) {
  return <div className="py-10 text-center text-sm text-muted-foreground">{text}</div>;
}

function DistributionRow({
  color,
  title,
  subtitle,
  amount,
  percentage,
}: {
  color: string;
  title: string;
  subtitle?: string;
  amount: number;
  percentage: number;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-2 min-w-0">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: color }} />
          <span className="truncate font-medium">{title}</span>
          {subtitle && <span className="text-xs text-muted-foreground shrink-0">{subtitle}</span>}
        </span>
        <span className="tabular-nums text-muted-foreground shrink-0">
          {fmtMoney(amount)}
          <span className="ml-2 text-foreground">{fmtPct(percentage)}</span>
        </span>
      </div>
      <Progress value={Math.min(100, percentage * 100)} />
    </div>
  );
}

function ChangeBadge({
  value,
  rate,
  invert,
}: {
  value?: number | null;
  rate?: number | null;
  invert?: boolean;
}) {
  if (value == null && rate == null) return <span className="text-muted-foreground text-sm">—</span>;
  const v = num(value ?? rate);
  const up = v >= 0;
  const good = invert ? !up : up;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={`inline-flex items-center gap-1 text-sm font-medium ${
        good ? "text-success" : "text-destructive"
      }`}
    >
      <Icon className="h-4 w-4" />
      {value != null && <span className="tabular-nums">{fmtMoney(Math.abs(num(value)))}</span>}
      {rate != null && <span className="tabular-nums">({fmtPct(rate)})</span>}
    </span>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  change,
  rate,
  hint,
  invert,
  loading,
}: {
  icon: typeof Wallet;
  label: string;
  value: string;
  change?: number | null;
  rate?: number | null;
  hint?: string;
  invert?: boolean;
  loading?: boolean;
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
        {loading ? (
          <Skeleton className="mt-3 h-7 w-28" />
        ) : (
          <div className="mt-3 font-display text-2xl font-semibold tabular-nums">{value}</div>
        )}
        <div className="mt-1 text-xs text-muted-foreground">
          {hint ?? <ChangeBadge value={change} rate={rate} invert={invert} />}
        </div>
      </CardContent>
    </Card>
  );
}
