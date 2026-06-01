import { createFileRoute, redirect, Outlet, Link, useRouter } from "@tanstack/react-router";
import { LayoutDashboard, Wallet, Target, Receipt, TrendingUp, LogOut, Menu } from "lucide-react";
import { useState } from "react";

import { tokenStore } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: ({ location }) => {
    // 仅在客户端校验 token（token 存在 localStorage，SSR 时不可用）
    if (typeof window === "undefined") return;
    if (!tokenStore.get()) {
      throw redirect({
        to: "/login",
        search: { redirect: location.href },
      });
    }
  },
  component: AuthenticatedLayout,
});

const NAV = [
  { to: "/dashboard", label: "财务概览", icon: LayoutDashboard },
  { to: "/assets", label: "资产 / 负债", icon: Wallet },
  { to: "/transactions", label: "现金流", icon: Receipt },
  { to: "/investments", label: "投资持仓", icon: TrendingUp },
  { to: "/goals", label: "财务目标", icon: Target },
] as const;

function AuthenticatedLayout() {
  const { logout } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const handleLogout = () => {
    logout();
    router.navigate({ to: "/login" });
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-40 w-64 bg-sidebar text-sidebar-foreground flex flex-col transition-transform",
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        <div className="px-6 py-6 border-b border-sidebar-border">
          <Link to="/dashboard" className="font-display text-lg font-semibold">
            <span className="text-gradient-gold">NetWorthLens</span>
          </Link>
          <div className="text-xs text-sidebar-foreground/60 mt-1">个人财务驾驶舱</div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
              activeProps={{
                className:
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm bg-sidebar-accent text-sidebar-accent-foreground font-medium",
              }}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-3 border-t border-sidebar-border">
          <Button
            variant="ghost"
            onClick={handleLogout}
            className="w-full justify-start text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <LogOut className="h-4 w-4 mr-2" />
            退出登录
          </Button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="lg:hidden flex items-center justify-between px-4 h-14 border-b bg-card">
          <button onClick={() => setOpen((o) => !o)} className="p-2 -ml-2">
            <Menu className="h-5 w-5" />
          </button>
          <div className="font-display font-semibold">NetWorthLens</div>
          <div className="w-9" />
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-10 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
