import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  User as UserIcon,
  Mail,
  Phone,
  Cake,
  Coins,
  IdCard,
  Clock,
  Heart,
  KeyRound,
  Pencil,
  Loader2,
  Trash2,
  Briefcase,
  Users,
} from "lucide-react";
import { ApiError } from "@/lib/api";
import { secretApi } from "@/lib/api/secret";
import { userApi, userProfileQueryOptions, type UpdateProfilePayload } from "@/lib/api/user";
import { GenderMap } from "@/lib/constant";
import { ProfileFormSheet } from "@/components/profile-form-sheet";
import { UserAvatar } from "@/components/user-avatar";
import { formatTimestamp } from "@/utils/time";

export const Route = createFileRoute("/_authenticated/profile")({
  component: ProfilePage,
});

/** 性别未设置时的展示兜底（后端该字段为 NULL 时会被 exclude_none 整个丢掉） */
const UNKNOWN_GENDER = { label: "未知", color: "bg-muted text-muted-foreground" };

function InfoRow({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 py-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="mt-0.5 break-all text-sm font-medium text-foreground">{children}</span>
      </div>
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-40" />
      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-16 w-16 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

function SecretCodeDialog({
  open,
  onOpenChange,
  onSubmit,
  submitting,
  configured,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (code: string) => void;
  submitting: boolean;
  configured: boolean;
}) {
  const [code, setCode] = useState("");
  const [confirmCode, setConfirmCode] = useState("");

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setCode("");
      setConfirmCode("");
    }
    onOpenChange(nextOpen);
  };

  const handleCodeChange = (value: string, setter: (value: string) => void) => {
    setter(value.replace(/\D/g, "").slice(0, 6));
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{configured ? "修改查看密钥" : "创建查看密钥"}</DialogTitle>
          <DialogDescription>设置 6 位数字密钥，用于在账户管理中显示金额。</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="secret-code">新密钥</Label>
            <Input
              id="secret-code"
              type="password"
              inputMode="numeric"
              autoComplete="new-password"
              maxLength={6}
              placeholder="请输入 6 位数字"
              value={code}
              onChange={(event) => handleCodeChange(event.target.value, setCode)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="secret-code-confirm">确认密钥</Label>
            <Input
              id="secret-code-confirm"
              type="password"
              inputMode="numeric"
              autoComplete="new-password"
              maxLength={6}
              placeholder="请再次输入"
              value={confirmCode}
              onChange={(event) => handleCodeChange(event.target.value, setConfirmCode)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={submitting}>
            取消
          </Button>
          <Button
            onClick={() => {
              if (code.length !== 6 || confirmCode.length !== 6) {
                toast.error("请输入完整的 6 位数字密钥");
                return;
              }
              if (code !== confirmCode) {
                toast.error("两次输入的密钥不一致");
                return;
              }
              onSubmit(code);
            }}
            disabled={submitting}
          >
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            保存密钥
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ProfilePage() {
  const queryClient = useQueryClient();
  const [secretDialogOpen, setSecretDialogOpen] = useState(false);
  const [deleteSecretOpen, setDeleteSecretOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  // 与 AuthProvider（侧边栏底部头像的数据源）共用同一份 queryOptions：
  // queryKey 一致，保存后的失效/写回才能同时刷新两处，不会一个变了另一个还是旧名字。
  const { data, isLoading, isError } = useQuery(userProfileQueryOptions);
  const updateMutation = useMutation({
    mutationFn: (payload: UpdateProfilePayload) => userApi.updateProfile(payload),
    onSuccess: (updated) => {
      toast.success("资料已更新");
      setEditOpen(false);
      // 直接把返回值写回缓存：侧边栏的头像与用户名立刻同步，无需等重新请求。
      queryClient.setQueryData(userProfileQueryOptions.queryKey, updated);
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "保存失败"),
  });
  const secretQuery = useQuery({
    queryKey: ["secret-status"],
    queryFn: secretApi.status,
  });
  const setSecretMutation = useMutation({
    mutationFn: (code: string) => secretApi.setDefault({ code }),
    onSuccess: () => {
      toast.success("查看密钥已保存");
      setSecretDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["secret-status"] });
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "保存查看密钥失败"),
  });
  const deleteSecretMutation = useMutation({
    mutationFn: secretApi.remove,
    onSuccess: () => {
      toast.success("查看密钥已删除");
      setDeleteSecretOpen(false);
      queryClient.invalidateQueries({ queryKey: ["secret-status"] });
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "删除查看密钥失败"),
  });

  if (isLoading) return <ProfileSkeleton />;

  if (isError || !data) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-destructive">加载个人信息失败</CardContent>
      </Card>
    );
  }

  const gender = (data.gender != null ? GenderMap[data.gender] : undefined) ?? UNKNOWN_GENDER;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display font-semibold">个人中心</h1>
          <p className="mt-1 text-sm text-muted-foreground">管理你的账户信息与偏好设置</p>
        </div>
        <Button onClick={() => setEditOpen(true)}>
          <Pencil className="mr-2 h-4 w-4" />
          编辑资料
        </Button>
      </div>

      <ProfileFormSheet
        open={editOpen}
        onOpenChange={setEditOpen}
        profile={data}
        onSubmit={(payload) => updateMutation.mutate(payload)}
        submitting={updateMutation.isPending}
      />

      <Card>
        <CardHeader className="flex flex-row items-center gap-4 space-y-0">
          <UserAvatar
            name={data.username}
            src={data.avatar}
            className="h-16 w-16"
            textClassName="text-lg"
          />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="truncate text-xl">{data.username}</CardTitle>
              {data.title ? (
                <Badge variant="outline" className="gap-1">
                  <Briefcase className="h-3 w-3" />
                  {data.title}
                </Badge>
              ) : null}
              <Badge variant="secondary" className={gender.color}>
                {gender.label}
              </Badge>
            </div>
            {data.account ? (
              <p className="truncate text-sm text-muted-foreground">@{data.account}</p>
            ) : null}
            {data.introduce ? (
              <p className="line-clamp-2 text-sm text-muted-foreground">{data.introduce}</p>
            ) : null}
          </div>
        </CardHeader>
      </Card>

      <SecretCodeDialog
        open={secretDialogOpen}
        onOpenChange={setSecretDialogOpen}
        onSubmit={(code) => setSecretMutation.mutate(code)}
        submitting={setSecretMutation.isPending}
        configured={!!secretQuery.data?.configured}
      />

      <AlertDialog open={deleteSecretOpen} onOpenChange={setDeleteSecretOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除金额查看密钥？</AlertDialogTitle>
            <AlertDialogDescription>
              删除后账户金额将无法显示，之后可以重新创建查看密钥。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteSecretMutation.isPending}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                deleteSecretMutation.mutate();
              }}
              disabled={deleteSecretMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteSecretMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              删除密钥
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-base">基本信息</CardTitle>
            <span className="text-xs text-muted-foreground">
              用户名、头衔、性别、生日、简介、头像可在「编辑资料」中修改
            </span>
          </div>
        </CardHeader>
        <CardContent className="grid gap-x-8 sm:grid-cols-2">
          <InfoRow icon={IdCard} label="用户 ID">
            {data.id}
          </InfoRow>
          <InfoRow icon={UserIcon} label="账号">
            {data.account || "—"}
          </InfoRow>
          <InfoRow icon={Briefcase} label="头衔">
            {data.title || "—"}
          </InfoRow>
          <InfoRow icon={Users} label="性别">
            {gender.label}
          </InfoRow>
          <InfoRow icon={Mail} label="邮箱">
            {data.email || "—"}
          </InfoRow>
          <InfoRow icon={Phone} label="手机">
            {data.phone || "—"}
          </InfoRow>
          <InfoRow icon={Cake} label="生日">
            {data.birth || "—"}
          </InfoRow>
          <InfoRow icon={Coins} label="基础币种">
            {data.base_currency || "—"}
          </InfoRow>
          <InfoRow icon={Heart} label="简介">
            {data.introduce || "—"}
          </InfoRow>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">金额查看密钥</CardTitle>
            </div>
            <Badge variant="secondary">
              {secretQuery.isLoading
                ? "检查中"
                : secretQuery.data?.configured
                  ? "已设置"
                  : "未设置"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            账户金额默认隐藏，设置后可在账户管理中使用 6 位密钥临时查看。
          </p>
          <div className="flex shrink-0 gap-2">
            <Button
              variant="outline"
              onClick={() => setSecretDialogOpen(true)}
              disabled={secretQuery.isLoading}
            >
              <KeyRound className="mr-2 h-4 w-4" />
              {secretQuery.data?.configured ? "修改密钥" : "创建密钥"}
            </Button>
            {secretQuery.data?.configured && (
              <Button
                variant="ghost"
                size="icon"
                aria-label="删除查看密钥"
                title="删除查看密钥"
                onClick={() => setDeleteSecretOpen(true)}
                disabled={deleteSecretMutation.isPending}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">账户活动</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-x-8 sm:grid-cols-2">
          <InfoRow icon={Clock} label="创建时间">
            {formatTimestamp(data.ctime)}
          </InfoRow>
        </CardContent>
        <Separator />
      </Card>
    </div>
  );
}
