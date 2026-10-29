import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";

import { Logo } from "@/components/logo";

export function AuthCard({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Brand panel */}
      <div
        className="relative hidden lg:flex flex-col justify-between p-12 text-sidebar-foreground overflow-hidden"
        style={{ background: "var(--gradient-hero)" }}
      >
        <Link to="/" className="inline-flex items-center" aria-label="Finora 首页">
          <Logo tone="onDark" markClassName="h-9" wordmarkClassName="text-xl" />
        </Link>
        <div className="relative z-10 space-y-6 max-w-md">
          <h2 className="font-display text-4xl font-semibold leading-tight">
            Your Wealth,
            <br />
            <span className="text-gradient-gold">In Focus.</span>
          </h2>
          <p className="text-sidebar-foreground/70 leading-relaxed">
            现代化个人财务管理平台 — 统一管理账户、资产、现金流与财务目标，让长期视角触手可及。
          </p>
          <div className="grid grid-cols-3 gap-4 pt-4">
            {[
              { k: "总资产", v: "实时汇总" },
              { k: "账单导入", v: "自动归类" },
              { k: "资产结构", v: "更清晰" },
            ].map((s) => (
              <div
                key={s.k}
                className="rounded-xl bg-white/5 backdrop-blur p-4 border border-white/10"
              >
                <div className="text-xs text-sidebar-foreground/60">{s.k}</div>
                <div className="text-sm font-medium mt-1 text-gold">{s.v}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="text-xs text-sidebar-foreground/40 relative z-10">
          © {new Date().getFullYear()} Finora
        </div>
        {/* decorative orbs */}
        <div
          className="absolute -top-32 -right-32 w-96 h-96 rounded-full opacity-30"
          style={{ background: "var(--gradient-gold)", filter: "blur(80px)" }}
        />
        <div
          className="absolute -bottom-40 -left-20 w-80 h-80 rounded-full opacity-20"
          style={{ background: "var(--gradient-primary)", filter: "blur(80px)" }}
        />
      </div>

      {/* Form panel */}
      <div className="flex flex-col justify-center p-6 sm:p-12 bg-background">
        <div className="w-full max-w-md mx-auto">
          <div className="lg:hidden mb-8">
            <Link to="/" aria-label="Finora 首页">
              <Logo tone="onLight" markClassName="h-8" wordmarkClassName="text-lg" />
            </Link>
          </div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">{title}</h1>
          <p className="text-muted-foreground mt-2 text-sm">{subtitle}</p>
          <div className="mt-8">{children}</div>
          {footer && <div className="mt-6 text-sm text-muted-foreground">{footer}</div>}
        </div>
      </div>
    </div>
  );
}
