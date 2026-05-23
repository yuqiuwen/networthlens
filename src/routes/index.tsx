import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BarChart3, PiggyBank, Target, Shield, Sparkles, TrendingUp } from "lucide-react";

import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NetWorthLens · 个人财务驾驶舱" },
      {
        name: "description",
        content:
          "以净资产为核心的个人资产管理平台。统一管理资产、负债、现金流、投资与目标，让财务长期视角触手可及。",
      },
      { property: "og:title", content: "NetWorthLens · 个人财务驾驶舱" },
      {
        property: "og:description",
        content: "看清净资产、管好现金流、追踪财务目标。",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="absolute top-0 inset-x-0 z-20">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 h-20 flex items-center justify-between text-sidebar-foreground">
          <Link to="/" className="font-display text-xl font-semibold">
            <span className="text-gradient-gold">NetWorthLens</span>
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm text-sidebar-foreground/70">
            <a href="#features" className="hover:text-sidebar-foreground transition">功能</a>
            <a href="#why" className="hover:text-sidebar-foreground transition">为什么选择</a>
            <a href="#metrics" className="hover:text-sidebar-foreground transition">数据</a>
          </nav>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" className="text-sidebar-foreground hover:bg-white/10 hover:text-sidebar-foreground">
              <Link to="/login">登录</Link>
            </Button>
            <Button asChild className="bg-gold text-gold-foreground hover:bg-gold/90">
              <Link to="/signup">免费开始</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section
        className="relative overflow-hidden text-sidebar-foreground"
        style={{ background: "var(--gradient-hero)" }}
      >
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full opacity-30"
          style={{ background: "var(--gradient-gold)", filter: "blur(120px)" }} />
        <div className="absolute -bottom-40 -left-20 w-[500px] h-[500px] rounded-full opacity-20"
          style={{ background: "var(--gradient-primary)", filter: "blur(120px)" }} />

        <div className="relative max-w-7xl mx-auto px-6 lg:px-10 pt-40 pb-32">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-sidebar-foreground/80">
              <Sparkles className="h-3 w-3 text-gold" />
              个人财务驾驶舱 · 全新发布
            </div>
            <h1 className="mt-6 font-display text-5xl sm:text-6xl lg:text-7xl font-semibold tracking-tight leading-[1.05]">
              看清<span className="text-gradient-gold">净资产</span>，<br />
              管好每一分现金流。
            </h1>
            <p className="mt-6 text-lg text-sidebar-foreground/75 max-w-2xl leading-relaxed">
              统一管理资产、负债、投资持仓与财务目标。让你随时知道：我有多少资产、负债还剩多少、净资产增长了多少、目标还差多少。
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Button asChild size="lg" className="bg-gold text-gold-foreground hover:bg-gold/90 shadow-[var(--shadow-gold)]">
                <Link to="/signup">
                  3 分钟搭建资产概览
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-white/20 bg-white/5 text-sidebar-foreground hover:bg-white/10 hover:text-sidebar-foreground">
                <Link to="/login">我已有账户</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="max-w-2xl">
            <p className="text-sm font-medium text-primary">核心能力</p>
            <h2 className="mt-2 font-display text-4xl font-semibold tracking-tight">
              不只是记账，而是财务全景视图
            </h2>
            <p className="mt-4 text-muted-foreground">
              记账类产品偏重流水，投资类工具偏重收益率。NetWorthLens 以净资产为核心，把所有维度串成一个系统。
            </p>
          </div>

          <div className="mt-16 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: BarChart3, title: "净资产趋势", desc: "实时计算总资产 - 总负债，看清你的财务曲线如何随时间变化。" },
              { icon: PiggyBank, title: "资产结构", desc: "现金、投资、房产分类一目了然，发现配置失衡，主动优化。" },
              { icon: TrendingUp, title: "投资持仓", desc: "基金 / 股票持仓汇总，成本、市值、收益率统一视角。" },
              { icon: Target, title: "财务目标", desc: "买房首付、应急金、旅行基金 — 目标与资产联动，进度可视化。" },
              { icon: Shield, title: "安全可信", desc: "JWT 双 Token 鉴权、本地加密存储，数据由你掌控。" },
              { icon: Sparkles, title: "智能提醒", desc: "账单到期、资产更新、目标节点 — 关键节点不再遗漏。" },
            ].map((f) => (
              <div key={f.title}
                className="group p-7 rounded-2xl border bg-card hover:shadow-[var(--shadow-elegant)] hover:border-primary/30 transition-all"
              >
                <div className="h-11 w-11 rounded-xl bg-accent flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-5 font-display text-lg font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Metrics */}
      <section id="metrics" className="py-24 bg-secondary/40">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 grid md:grid-cols-4 gap-8 text-center">
          {[
            { v: "3 min", k: "完成首次资产录入" },
            { v: "100%", k: "净资产实时计算" },
            { v: "6+", k: "支持资产类型" },
            { v: "JWT", k: "双 Token 安全鉴权" },
          ].map((s) => (
            <div key={s.k}>
              <div className="font-display text-4xl font-semibold text-primary">{s.v}</div>
              <div className="mt-2 text-sm text-muted-foreground">{s.k}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section id="why" className="py-24">
        <div className="max-w-4xl mx-auto px-6 lg:px-10 text-center">
          <h2 className="font-display text-4xl sm:text-5xl font-semibold tracking-tight">
            把财务长期视角，<span className="text-gradient-gold">交还给你自己</span>。
          </h2>
          <p className="mt-6 text-muted-foreground max-w-2xl mx-auto">
            从今天起，告别零散的记账与遗忘的目标。让 NetWorthLens 成为你每月一次、十分钟搞定的财务复盘工具。
          </p>
          <div className="mt-10">
            <Button asChild size="lg" className="shadow-[var(--shadow-elegant)]">
              <Link to="/signup">
                免费创建账户
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t py-10">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 flex flex-wrap items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="font-display font-semibold text-foreground">NetWorthLens</div>
          <div>© {new Date().getFullYear()} NetWorthLens · 个人资产管理平台</div>
        </div>
      </footer>
    </div>
  );
}
