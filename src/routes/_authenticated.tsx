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
  Settings,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { authApi, tokenStore } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { UserAvatar } from "@/components/user-avatar";
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
  { to: "/settings", label: "系统设置", icon: Settings },
] as const;

/** 尚未上线的模块，在导航中标注「开发中」，与落地页「正在开发」保持一致 */
// 财务目标（/goals）已于 P0 上线，不再标注。
const SOON_ROUTES = new Set<string>(["/investments"]);

function AuthenticatedLayout() {
  const { token, logout, profile } = useAuth();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  // 侧边栏底部展示当前登录用户。profile 还没回来时先用「我的账户」占位，
  // 避免登录后第一帧出现空白头像位。
  const displayName = profile?.username?.trim() || "我的账户";
  // 副标题优先展示头衔，没有头衔就退回账号。
  const secondaryLabel = profile?.title?.trim() || (profile?.account ? `@${profile.account}` : "");

  // 浏览过程中登录态失效（刷新失败）或用户主动退出时，把人送回登录页。
  //
  // 上面的路由守卫走的是 beforeLoad，而 beforeLoad **只在导航时执行一次**：
  // 页面已经渲染出来之后 token 才被清掉，守卫不会重跑。所以这里必须主动补一次
  // 导航 —— 否则用户就停在一个什么都加载不出来的页面上，只看到
  // 「加载失败：认证失败」，既不跳转也不恢复（这正是修复前的行为）。
  //
  // 主动退出和被动失效共用这一条出口，避免两处各写一遍导航逻辑导致行为不一致。
  useEffect(() => {
    if (token) return;
    const reason = tokenStore.consumeClearedReason();
    if (reason) toast.error(reason);
    router.navigate({
      to: "/login",
      // 带上来路，重新登录后能回到刚才那一页。
      search: { redirect: router.state.location.href },
      // replace：别让用户按返回键又回到这个已经失效的页面。
      replace: true,
    });
  }, [token, router]);

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } finally {
      // 只清登录态；跳转交给上面的 effect 统一负责（主动退出时 reason 为空，不会弹提示）。
      logout();
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
          <Link
            to="/dashboard"
            className="flex min-w-0 items-center"
            aria-label="Finora 财务概览"
          >
            <Logo
              tone="onDark"
              markClassName="h-9"
              showWordmark={!collapsed}
              subtitle="Your Wealth, In Focus."
            />
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              title={
                collapsed
                  ? SOON_ROUTES.has(item.to)
                    ? `${item.label}（开发中）`
                    : item.label
                  : undefined
              }
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
              {SOON_ROUTES.has(item.to) && (
                <span
                  className={cn(
                    "ml-auto whitespace-nowrap rounded-full bg-sidebar-foreground/10 px-1.5 py-0.5 text-[10px] font-medium text-sidebar-foreground/60",
                    collapsed && "lg:hidden",
                  )}
                >
                  开发中
                </span>
              )}
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
                // 折叠后用户名会被隐藏，此时按钮上只剩头像，
                // 必须靠 aria-label 把「这是谁」补回来。
                aria-label={displayName ? `用户菜单：${displayName}` : "用户菜单"}
              >
                <UserAvatar
                  name={profile?.username}
                  src={profile?.avatar}
                  className="h-8 w-8"
                  textClassName="text-xs"
                  tone="onDark"
                />
                <span className={cn("flex min-w-0 flex-col text-left", collapsed && "lg:hidden")}>
                  <span className="truncate text-sm text-sidebar-foreground/90">{displayName}</span>
                  {secondaryLabel && (
                    <span className="truncate text-[11px] text-sidebar-foreground/55">
                      {secondaryLabel}
                    </span>
                  )}
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="top" className="w-56">
              <DropdownMenuLabel className="flex min-w-0 flex-col gap-0.5">
                <span className="truncate text-sm">{displayName}</span>
                {secondaryLabel && (
                  <span className="truncate text-xs font-normal text-muted-foreground">
                    {secondaryLabel}
                  </span>
                )}
              </DropdownMenuLabel>
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
          <Logo tone="onLight" markClassName="h-7" wordmarkClassName="text-base" />
          <div className="w-9" />
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-10 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
