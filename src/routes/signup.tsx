import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "@tanstack/react-form";
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
  const [cooldown, setCooldown] = useState(0);

  const form = useForm({
    defaultValues: { account: "", username: "", pwd: "", code: "" },
    onSubmit: async ({ value }) => {
      if (channel === "account" && !/^[A-Za-z0-9_-]{4,12}$/.test(value.account)) {
        toast.error("账号只能包含英文、数字、下划线和短横线，长度 4-12");
        return;
      }
      try {
        const result = await authApi.signup({
          account: value.account.trim(),
          auth_type: AUTH_TYPE_MAP[channel],
          pwd: value.pwd,
          code: value.code || undefined,
          username: value.username || undefined,
        });
        setSession(result);
        toast.success("注册成功，欢迎加入");
        navigate({ to: "/dashboard" });
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : "注册失败");
      }
    },
  });

  const sendCode = () => {
    const account = form.getFieldValue("account");
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

  const accountLabel =
    channel === "phone" ? "手机号" : channel === "email" ? "邮箱" : "账号";
  const accountPlaceholder =
    channel === "phone"
      ? "请输入手机号"
      : channel === "email"
        ? "name@example.com"
        : "4-12 位英文/数字/_/-";

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

        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
          className="space-y-4 mt-6"
        >
          <form.Field
            name="account"
            validators={{
              onChange: ({ value }) => (!value ? `请输入${accountLabel}` : undefined),
            }}
          >
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>{accountLabel}</Label>
                <Input
                  id={field.name}
                  placeholder={accountPlaceholder}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                {field.state.meta.errors.length > 0 && (
                  <p className="text-xs text-destructive">{field.state.meta.errors[0]}</p>
                )}
              </div>
            )}
          </form.Field>

          <form.Field name="username">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>昵称（可选）</Label>
                <Input
                  id={field.name}
                  placeholder="如何称呼你"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
              </div>
            )}
          </form.Field>

          <form.Field
            name="pwd"
            validators={{
              onChange: ({ value }) =>
                !value ? "请输入密码" : value.length < 8 ? "密码至少 8 位" : undefined,
            }}
          >
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>密码</Label>
                <Input
                  id={field.name}
                  type="password"
                  placeholder="至少 8 位"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                {field.state.meta.errors.length > 0 && (
                  <p className="text-xs text-destructive">{field.state.meta.errors[0]}</p>
                )}
              </div>
            )}
          </form.Field>

          {channel !== "account" && (
            <form.Field name="code">
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor={field.name}>
                    {channel === "phone" ? "短信验证码" : "邮箱验证码"}
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id={field.name}
                      placeholder="6 位验证码"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
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
                </div>
              )}
            </form.Field>
          )}

          <form.Subscribe selector={(s) => [s.canSubmit, s.isSubmitting] as const}>
            {([canSubmit, isSubmitting]) => (
              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={!canSubmit || isSubmitting}
              >
                {isSubmitting ? "创建中..." : "创建账户"}
              </Button>
            )}
          </form.Subscribe>
        </form>
      </Tabs>
    </AuthCard>
  );
}
