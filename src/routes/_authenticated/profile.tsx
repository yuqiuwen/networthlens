import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  User as UserIcon,
  Mail,
  Phone,
  Cake,
  Coins,
  IdCard,
  Clock,
  Heart,
} from "lucide-react";
import { userApi, type UserProfile } from "@/lib/api";
import { defineMap } from "@/utils/enum";
import { formatTimestamp } from "@/utils/time";

export const Route = createFileRoute("/_authenticated/profile")({
  component: ProfilePage,
});

const GENDERS = [
  { value: 0, label: "女", color: "bg-pink-500/15 text-pink-600 dark:text-pink-300" },
  { value: 1, label: "男", color: "bg-sky-500/15 text-sky-600 dark:text-sky-300" },
] as const;

const GENDER_MAP = defineMap(GENDERS as unknown as { value: number; label: string; color: string }[], "value", [
  "label",
  "color",
]) as Record<number, { label: string; color: string }>;

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

function ProfilePage() {
  const { data, isLoading, isError, error } = useQuery<UserProfile>({
    queryKey: ["user", "profile"],
    queryFn: () => userApi.getProfile(),
  });

  if (isLoading) return <ProfileSkeleton />;

  if (isError || !data) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-destructive">
          加载个人信息失败：{(error as Error)?.message ?? "未知错误"}
        </CardContent>
      </Card>
    );
  }

  const gender = GENDER_MAP[data.gender] ?? { label: "未知", color: "bg-muted text-muted-foreground" };
  const initial = data.username?.slice(0, 1)?.toUpperCase() ?? "U";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-semibold">个人中心</h1>
        <p className="mt-1 text-sm text-muted-foreground">管理你的账户信息与偏好设置</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center gap-4 space-y-0">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="bg-primary/10 text-lg font-semibold text-primary">
              {initial}
            </AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex items-center gap-2">
              <CardTitle className="truncate text-xl">{data.username}</CardTitle>
              <Badge variant="secondary" className={gender.color}>
                {gender.label}
              </Badge>
            </div>
            <p className="truncate text-sm text-muted-foreground">@{data.account}</p>
            {data.introduce ? (
              <p className="line-clamp-2 text-sm text-muted-foreground">{data.introduce}</p>
            ) : null}
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">基本信息</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-x-8 sm:grid-cols-2">
          <InfoRow icon={IdCard} label="用户 ID">
            {data.id}
          </InfoRow>
          <InfoRow icon={UserIcon} label="账号">
            {data.account}
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
