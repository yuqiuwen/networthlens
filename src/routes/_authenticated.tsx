import { createFileRoute, redirect, Outlet, Link, useRouter } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Wallet,
  Target,
  Receipt,
  TrendingUp,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  User,
  Tags,
  Bot,
} from "lucide-react";
import { useState } from "react";

import { authApi, tokenStore } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: ({ location }) => {
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
  { to: "/accounts", label: "账户管理", icon: Wallet },
  { to: "/categories", label: "分类管理", icon: Tags },
  { to: "/assets", label: "资产管理", icon: Wallet },
  { to: "/transactions", label: "现金流", icon: Receipt },
  { to: "/investments", label: "投资持仓", icon: TrendingUp },
  { to: "/goals", label: "财务目标", icon: Target },
  { to: "/assistant", label: "AI 助手", icon: Bot },
] as const;

function AuthenticatedLayout() {
  const { logout } = useAuth();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } finally {
      logout();
      router.navigate({ to: "/login" });
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* 移动端遮罩 */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:sticky top-0 left-0 z-40 h-screen bg-sidebar text-sidebar-foreground flex flex-col transition-all duration-200",
          collapsed ? "lg:w-16" : "lg:w-64",
          "w-64",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        <div
          className={cn(
            "flex items-center border-b border-sidebar-border h-16 shrink-0",
            collapsed ? "lg:justify-center lg:px-2 px-6" : "px-6",
          )}
        >
          <Link to="/dashboard" className="font-display text-lg font-semibold truncate">
            {collapsed ? (
              <span className="text-gradient-gold">NWL</span>
            ) : (
              <>
                <span className="text-gradient-gold">NetWorthLens</span>
                <div className="text-xs text-sidebar-foreground/60 mt-1 font-normal">
                  个人财务驾驶舱
                </div>
              </>
            )}
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              title={collapsed ? item.label : undefined}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors",
                collapsed && "lg:justify-center lg:px-0",
              )}
              activeProps={{
                className: cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm bg-sidebar-accent text-sidebar-accent-foreground font-medium",
                  collapsed && "lg:justify-center lg:px-0",
                ),
              }}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span className={cn(collapsed && "lg:hidden")}>{item.label}</span>
            </Link>
          ))}
        </nav>

        {/* 底部：折叠切换 + 用户头像菜单 */}
        <div
          className={cn(
            "p-3 border-t border-sidebar-border shrink-0 flex items-center gap-2",
            collapsed ? "lg:flex-col" : "justify-between",
          )}
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="flex items-center gap-2 rounded-lg p-1 hover:bg-sidebar-accent transition-colors flex-1 min-w-0"
                aria-label="用户菜单"
              >
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback className="bg-primary/20 text-primary text-xs">
                    <User className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <span
                  className={cn(
                    "text-sm text-sidebar-foreground/90 truncate text-left",
                    collapsed && "lg:hidden",
                  )}
                >
                  我的账户
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="top" className="w-48">
              <DropdownMenuLabel>账户</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/profile" className="cursor-pointer">
                  <User className="h-4 w-4 mr-2" />
                  个人中心
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleLogout}
                className="text-destructive focus:text-destructive cursor-pointer"
              >
                <LogOut className="h-4 w-4 mr-2" />
                退出登录
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed((c) => !c)}
            className="hidden lg:inline-flex h-8 w-8 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            aria-label={collapsed ? "展开菜单" : "收起菜单"}
          >
            {collapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </Button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="lg:hidden flex items-center justify-between px-4 h-14 border-b bg-card">
          <button onClick={() => setMobileOpen((o) => !o)} className="p-2 -ml-2">
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
