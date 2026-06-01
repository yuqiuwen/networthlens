import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-semibold">个人中心</h1>
        <p className="text-sm text-muted-foreground mt-1">管理你的账户信息与偏好设置</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>账户信息</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          个人资料管理功能正在建设中。
        </CardContent>
      </Card>
    </div>
  );
}
