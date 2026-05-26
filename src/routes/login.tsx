import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import { toast } from "sonner";
import { z } from "zod";

import { AuthCard } from "@/components/auth-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ApiError, authApi, tokenStore } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

const searchSchema = z.object({
  redirect: z.string().optional().catch(undefined),
});

export const Route = createFileRoute("/login")({
  validateSearch: searchSchema,
  beforeLoad: () => {
    if (tokenStore.get()) {
      throw redirect({ to: "/dashboard" });
    }
  },
  head: () => ({
    meta: [
      { title: "登录 · NetWorthLens" },
      { name: "description", content: "登录你的 NetWorthLens 账户，查看净资产与财务目标。" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const { setSession } = useAuth();

  const [mode, setMode] = useState<"pwd" | "code">("pwd");
  const [sending, setSending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const form = useForm({
    defaultValues: { account: "", secret: "" },
    onSubmit: async ({ value }) => {
      try {
        const result = await authApi.login({
          account: value.account.trim(),
          code: value.secret,
          code_type: mode,
        });
        setSession(result);
        toast.success("登录成功");
        navigate({ to: search.redirect ?? "/dashboard" });
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : "登录失败");
      }
    },
  });

  const sendCode = async () => {
    const account = form.getFieldValue("account");
    if (!account) {
      toast.error("请先输入手机号或邮箱");
      return;
    }
    setSending(true);
    try {
      await new Promise((r) => setTimeout(r, 600));
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
    } finally {
      setSending(false);
    }
  };

  return (
    <AuthCard
      title="欢迎回来"
      subtitle="使用手机号或邮箱登录你的财务驾驶舱"
      footer={
        <span>
          还没有账户？{" "}
          <Link to="/signup" className="text-primary font-medium hover:underline">
            立即注册
          </Link>
        </span>
      }
    >
      <Tabs value={mode} onValueChange={(v) => setMode(v as "pwd" | "code")}>
        <TabsList className="grid grid-cols-2 w-full">
          <TabsTrigger value="pwd">密码登录</TabsTrigger>
          <TabsTrigger value="code">验证码登录</TabsTrigger>
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
              onChange: ({ value }) => (!value ? "请输入手机号或邮箱" : undefined),
            }}
          >
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>手机号 / 邮箱</Label>
                <Input
                  id={field.name}
                  name={field.name}
                  autoComplete="username"
                  placeholder="请输入手机号或邮箱"
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

          <form.Field
            name="secret"
            validators={{
              onChange: ({ value }) =>
                !value ? (mode === "pwd" ? "请输入密码" : "请输入验证码") : undefined,
            }}
          >
            {(field) => (
              <>
                <TabsContent value="pwd" className="m-0 space-y-2">
                  <Label htmlFor={field.name}>密码</Label>
                  <Input
                    id={field.name}
                    type="password"
                    autoComplete="current-password"
                    placeholder="请输入密码"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                </TabsContent>

                <TabsContent value="code" className="m-0 space-y-2">
                  <Label htmlFor={field.name}>验证码</Label>
                  <div className="flex gap-2">
                    <Input
                      id={field.name}
                      inputMode="numeric"
                      placeholder="6 位验证码"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={sendCode}
                      disabled={sending || cooldown > 0}
                      className="shrink-0"
                    >
                      {cooldown > 0 ? `${cooldown}s` : "发送验证码"}
                    </Button>
                  </div>
                </TabsContent>

                {field.state.meta.errors.length > 0 && (
                  <p className="text-xs text-destructive">{field.state.meta.errors[0]}</p>
                )}
              </>
            )}
          </form.Field>

          <form.Subscribe selector={(s) => [s.canSubmit, s.isSubmitting] as const}>
            {([canSubmit, isSubmitting]) => (
              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={!canSubmit || isSubmitting}
              >
                {isSubmitting ? "登录中..." : "登录"}
              </Button>
            )}
          </form.Subscribe>
        </form>
      </Tabs>
    </AuthCard>
  );
}
