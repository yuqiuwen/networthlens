import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { AuthCard } from "@/components/auth-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ApiError, authApi, tokenStore } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

type Channel = "phone" | "email" | "account";

const AUTH_TYPE_MAP: Record<Channel, 1 | 2 | 3> = {
  account: 1,
  phone: 2,
  email: 3,
};

export const Route = createFileRoute("/signup")({
  beforeLoad: () => {
    if (tokenStore.get()) {
      throw redirect({ to: "/dashboard" });
    }
  },
  head: () => ({
    meta: [
      { title: "注册 · NetWorthLens" },
      { name: "description", content: "创建你的 NetWorthLens 账户，三分钟搭建个人资产概览。" },
    ],
  }),
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const { setSession } = useAuth();

  const [channel, setChannel] = useState<Channel>("phone");
  const [account, setAccount] = useState("");
  const [username, setUsername] = useState("");
  const [pwd, setPwd] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account || !pwd) {
      toast.error("请填写账号和密码");
      return;
    }
    if (channel === "account" && !/^[A-Za-z0-9_-]{4,12}$/.test(account)) {
      toast.error("账号只能包含英文、数字、下划线和短横线，长度 4-12");
      return;
    }
    setLoading(true);
    try {
      const result = await authApi.signup({
        account: account.trim(),
        auth_type: AUTH_TYPE_MAP[channel],
        pwd,
        code: code || undefined,
        username: username || undefined,
      });
      setSession(result);
      toast.success("注册成功，欢迎加入");
      navigate({ to: "/dashboard" });
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "注册失败";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const sendCode = async () => {
    if (!account) {
      toast.error("请先输入账号");
      return;
    }
    toast.success("验证码已发送");
    setCooldown(60);
    const t = setInterval(() => {
      setCooldown((c) => {
        if (c <= 1) {
          clearInterval(t);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  };

  return (
    <AuthCard
      title="创建账户"
      subtitle="开始你的个人资产管理之旅"
      footer={
        <span>
          已有账户？{" "}
          <Link to="/login" className="text-primary font-medium hover:underline">
            直接登录
          </Link>
        </span>
      }
    >
      <Tabs value={channel} onValueChange={(v) => setChannel(v as Channel)}>
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="phone">手机号</TabsTrigger>
          <TabsTrigger value="email">邮箱</TabsTrigger>
          <TabsTrigger value="account">账号</TabsTrigger>
        </TabsList>

        <form onSubmit={submit} className="space-y-4 mt-6">
          <div className="space-y-2">
            <Label htmlFor="account">
              {channel === "phone" ? "手机号" : channel === "email" ? "邮箱" : "账号"}
            </Label>
            <Input
              id="account"
              placeholder={
                channel === "phone"
                  ? "请输入手机号"
                  : channel === "email"
                  ? "name@example.com"
                  : "4-12 位英文/数字/_/-"
              }
              value={account}
              onChange={(e) => setAccount(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="username">昵称（可选）</Label>
            <Input
              id="username"
              placeholder="如何称呼你"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="pwd">密码</Label>
            <Input
              id="pwd"
              type="password"
              placeholder="至少 8 位"
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
            />
          </div>

          <TabsContent value="phone" className="m-0 space-y-2">
            <Label htmlFor="code">短信验证码</Label>
            <div className="flex gap-2">
              <Input
                id="code"
                placeholder="6 位验证码"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
              <Button
                type="button"
                variant="outline"
                onClick={sendCode}
                disabled={cooldown > 0}
                className="shrink-0"
              >
                {cooldown > 0 ? `${cooldown}s` : "发送验证码"}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="email" className="m-0 space-y-2">
            <Label htmlFor="code">邮箱验证码</Label>
            <div className="flex gap-2">
              <Input
                id="code"
                placeholder="6 位验证码"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
              <Button
                type="button"
                variant="outline"
                onClick={sendCode}
                disabled={cooldown > 0}
                className="shrink-0"
              >
                {cooldown > 0 ? `${cooldown}s` : "发送验证码"}
              </Button>
            </div>
          </TabsContent>

          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading ? "创建中..." : "创建账户"}
          </Button>
        </form>
      </Tabs>
    </AuthCard>
  );
}
