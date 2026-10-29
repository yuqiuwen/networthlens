import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BarChart3,
  Bot,
  PiggyBank,
  Receipt,
  Sparkles,
  Target,
  Wallet,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Logo, LogoMark } from "@/components/logo";

/**
 * 落地页
 *
 * 品牌口径（与 README、__root.tsx 保持一致）：
 * - 产品名只有英文 **Finora**，没有中文名。中文只出现在描述性文案里。
 * - Slogan 是 **Your Wealth, In Focus.** —— 中英双语的「产品介绍」段落是用户给的原文，
 *   不要再改写或压缩，那是对外统一话术。
 */
const TAGLINE = "Your Wealth, In Focus.";

const INTRO_EN =
  "Finora is a modern personal finance management platform that helps you organize financial accounts, analyze assets, track investment portfolios, and achieve financial goals with AI-powered insights.";

const INTRO_ZH =
  "Finora 是一款现代化个人财务管理平台，集账户管理、资产分析、投资持仓追踪、财务目标规划和 AI 智能助手于一体，帮助用户清晰掌握财务状况，更从容地规划未来。";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: `Finora · ${TAGLINE}` },
      { name: "description", content: INTRO_ZH },
      { property: "og:title", content: `Finora · ${TAGLINE}` },
      { property: "og:description", content: INTRO_EN },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
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
          <Link to="/" className="flex items-center" aria-label="Finora 首页">
            <Logo tone="onDark" markClassName="h-9" wordmarkClassName="text-xl" />
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm text-sidebar-foreground/70">
            <a href="#features" className="hover:text-sidebar-foreground transition">
              功能
            </a>
            <a href="#metrics" className="hover:text-sidebar-foreground transition">
              数据
            </a>
            <a href="#about" className="hover:text-sidebar-foreground transition">
              关于
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <Button
              asChild
              variant="ghost"
              className="text-sidebar-foreground hover:bg-white/10 hover:text-sidebar-foreground"
            >
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
        {/* 背景层：细网格 + 右侧光斑 + 一圈「对焦环」。
            网格用 mask 只在右半边淡入，左侧文案区保持干净；
            色相跟着 --gradient-hero 的祖母绿（H165）走，不要用品牌青绿 H181，
            否则会和金色 CTA 打架。 */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.08) 1px, transparent 1px)",
            backgroundSize: "76px 76px",
            maskImage: "radial-gradient(900px 700px at 70% 45%, #000 0%, transparent 80%)",
            WebkitMaskImage: "radial-gradient(900px 700px at 70% 45%, #000 0%, transparent 80%)",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute top-1/2 right-10 hidden h-[420px] w-[420px] -translate-y-1/2 rounded-full opacity-65 xl:block"
          style={{
            background: "radial-gradient(circle, oklch(0.78 0.10 170 / 0.55), transparent 68%)",
            filter: "blur(80px)",
          }}
        />
        {/* 「对焦环」呼应 slogan 里的 In Focus */}
        <div
          aria-hidden
          className="pointer-events-none absolute top-1/2 right-24 hidden h-[330px] w-[330px] -translate-y-1/2 rounded-full border xl:block"
          style={{
            borderColor: "oklch(0.72 0.11 168 / 0.28)",
            background: "radial-gradient(circle, oklch(0.66 0.11 168 / 0.26) 0%, transparent 68%)",
          }}
        />
        <div
          className="absolute -bottom-40 -left-20 w-[500px] h-[500px] rounded-full opacity-20"
          style={{ background: "var(--gradient-primary)", filter: "blur(120px)" }}
        />

        <div className="relative max-w-7xl mx-auto px-6 lg:px-10 pt-40 pb-32">
          <div className="max-w-3xl">
            {/* 标识本身是 100.1×116.6（略高于宽），所以只给高度、宽度交给 viewBox 的固有比例，
                否则用 w-20 会把它压成正方形并在左右留白。 */}
            <LogoMark
              className="h-20 w-auto text-sidebar-foreground drop-shadow-[0_10px_30px_rgba(0,0,0,0.45)]"
              title="Finora 标识"
            />
            <div className="mt-7 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-sidebar-foreground/80">
              <Sparkles className="h-3 w-3 text-gold" />
              个人财务管理平台 · 全新发布
            </div>
            <h1 className="mt-6 font-display text-5xl sm:text-6xl lg:text-7xl font-semibold tracking-tight leading-[1.05]">
              Your Wealth,
              <br />
              <span className="text-gradient-gold">In Focus.</span>
            </h1>
            <p className="mt-6 text-lg text-sidebar-foreground/75 max-w-2xl leading-relaxed">
              {INTRO_ZH}
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Button
                asChild
                size="lg"
                className="bg-gold text-gold-foreground hover:bg-gold/90 shadow-[var(--shadow-gold)]"
              >
                <Link to="/signup">
                  3 分钟搭建资产概览
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-white/20 bg-white/5 text-sidebar-foreground hover:bg-white/10 hover:text-sidebar-foreground"
              >
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
              记账类产品偏重流水，账户类工具只看余额。Finora
              把账户、资产与现金流串成一个系统，让你看清钱从哪来、花到哪去。
            </p>
          </div>

          <div className="mt-16 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: BarChart3,
                title: "财务概览",
                desc: "总资产、可用资金、本月收支与储蓄率，一屏看清财务全貌。",
              },
              {
                icon: Wallet,
                title: "账户管理",
                desc: "现金、银行卡、支付账户、信用卡、证券与理财账户，余额统一汇总。",
              },
              {
                icon: PiggyBank,
                title: "资产管理",
                desc: "房产、车辆、收藏品等按自定义分类记录，估值与购入成本都留档。",
              },
              {
                icon: Receipt,
                title: "现金流管理",
                desc: "导入微信 / 支付宝账单并自动去重，按关键词归入自定义分类，逐笔可筛可查。",
              },
              {
                icon: Target,
                title: "财务目标规划",
                desc: "为储蓄、置产、旅行设定目标金额与期限，记录每笔投入并预测达成时间。",
              },
              {
                icon: Bot,
                title: "AI 财务助手",
                desc: "用自然语言查询账户、资产、现金流与目标进度，直接拿到分析结论。",
              },
            ].map((f) => (
              <div
                key={f.title}
                className="group p-7 rounded-2xl border bg-card shadow-soft hover:shadow-[var(--shadow-elegant)] hover:border-primary/30 transition-all"
              >
                <div className="h-11 w-11 rounded-xl bg-accent flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-5 font-display text-lg font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>

          {/*
            开发中清单必须与真实进度一致：
            财务目标（/goals）已上线，只剩投资持仓与智能提醒还没做
            （见 src/routes/_authenticated.tsx 的 SOON_ROUTES）。
          */}
          <div className="mt-10 flex flex-wrap items-center gap-x-7 gap-y-3 rounded-2xl border border-dashed px-6 py-5">
            <span className="text-sm font-medium text-muted-foreground">正在开发</span>
            {["投资持仓追踪", "智能提醒"].map((t) => (
              <span
                key={t}
                className="inline-flex items-center gap-2 text-sm text-muted-foreground"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-primary/50" />
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Metrics */}
      <section id="metrics" className="py-24 bg-secondary/40">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 grid md:grid-cols-4 gap-8 text-center">
          {[
            { v: "7 类", k: "账户类型统一管理" },
            { v: "10 类", k: "资产类型分类记录" },
            { v: "自动", k: "账单导入与分类匹配" },
            { v: "AI", k: "自然语言财务问答" },
          ].map((s) => (
            <div key={s.k}>
              <div className="font-display text-4xl font-semibold text-primary">{s.v}</div>
              <div className="mt-2 text-sm text-muted-foreground">{s.k}</div>
            </div>
          ))}
        </div>
      </section>

      {/* 产品介绍（中英双语，文案为用户提供的对外统一话术） */}
      <section id="about" className="py-24">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 grid lg:grid-cols-2 gap-12 lg:gap-16">
          <div>
            <p className="text-sm font-medium text-primary">About Finora</p>
            <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight">{TAGLINE}</h2>
            <p className="mt-5 text-muted-foreground leading-relaxed">{INTRO_EN}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-primary">关于 Finora</p>
            <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight">
              让财富，清晰可见。
            </h2>
            <p className="mt-5 text-muted-foreground leading-relaxed">{INTRO_ZH}</p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="why" className="py-24 bg-secondary/40">
        <div className="max-w-4xl mx-auto px-6 lg:px-10 text-center">
          <h2 className="font-display text-4xl sm:text-5xl font-semibold tracking-tight">
            把财务长期视角，<span className="text-gradient-gold">交还给你自己</span>。
          </h2>
          <p className="mt-6 text-muted-foreground max-w-2xl mx-auto">
            从今天起，告别零散的记账和分散的账户。让 Finora
            成为你每月一次、十分钟搞定的财务复盘工具。
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
          <Logo tone="onLight" markClassName="h-8" subtitle={TAGLINE} />
          <div>
            © {new Date().getFullYear()} Finora · {TAGLINE}
          </div>
        </div>
      </footer>
    </div>
  );
}
