import { useEffect, useState } from "react";
import { Loader2, X } from "lucide-react";

import type { UpdateProfilePayload, UserProfile } from "@/lib/api/user";
import { Gender, GenderOptions } from "@/lib/constant";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { DatePicker } from "@/components/date-picker";
import { UserAvatar } from "@/components/user-avatar";

/** Radix Select 不允许空字符串作为 value，用一个哨兵值表示「不填」 */
const NO_GENDER = "none";

const USERNAME_MIN = 4;
const USERNAME_MAX = 20;
const TITLE_MAX = 20;
const INTRODUCE_MAX = 100;
const AVATAR_MAX = 500;

interface FormState {
  username: string;
  title: string;
  /** NO_GENDER | "0" | "1" */
  gender: string;
  birth: string;
  introduce: string;
  avatar: string;
}

const fromProfile = (profile: UserProfile): FormState => ({
  username: profile.username ?? "",
  title: profile.title ?? "",
  // gender 可能是 0（女），不能用 `profile.gender ?? NO_GENDER` —— 0 会被当成空值
  gender:
    profile.gender === Gender.FEMALE || profile.gender === Gender.MALE
      ? String(profile.gender)
      : NO_GENDER,
  birth: profile.birth ?? "",
  introduce: profile.introduce ?? "",
  avatar: profile.avatar ?? "",
});

export function ProfileFormSheet({
  open,
  onOpenChange,
  profile,
  onSubmit,
  submitting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: UserProfile;
  onSubmit: (payload: UpdateProfilePayload) => void;
  submitting: boolean;
}) {
  const [form, setForm] = useState<FormState>(() => fromProfile(profile));
  const [error, setError] = useState<string | null>(null);

  // 每次打开都按最新的 profile 重置，避免上一次编辑的残留。
  useEffect(() => {
    if (!open) return;
    setForm(fromProfile(profile));
    setError(null);
  }, [open, profile]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = () => {
    const username = form.username.trim();

    if (!username) return setError("请填写用户名");
    if (username.length < USERNAME_MIN || username.length > USERNAME_MAX) {
      return setError(`用户名长度必须在 ${USERNAME_MIN}-${USERNAME_MAX} 个字符`);
    }
    if (form.title.trim().length > TITLE_MAX) return setError(`头衔最多 ${TITLE_MAX} 个字`);
    if (form.introduce.trim().length > INTRODUCE_MAX) {
      return setError(`个人简介最多 ${INTRODUCE_MAX} 个字`);
    }
    if (form.avatar.trim().length > AVATAR_MAX) {
      return setError(`头像地址最多 ${AVATAR_MAX} 个字符`);
    }

    setError(null);
    onSubmit({
      username,
      // 清空即提交 null，让后端把该列置为 NULL，
      // 而不是存一个空串（空串会让「没填过」和「填过又清空」在库里长得一样）。
      title: form.title.trim() || null,
      introduce: form.introduce.trim() || null,
      gender: form.gender === NO_GENDER ? null : (Number(form.gender) as Gender),
      birth: form.birth || null,
      avatar: form.avatar.trim() || null,
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-md"
      >
        <SheetHeader className="border-b p-6 text-left">
          <SheetTitle className="font-display">编辑资料</SheetTitle>
          <SheetDescription>
            用户名、头衔、性别、生日、简介和头像都可以在这里修改。
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-5 p-6">
          <div className="space-y-2">
            <Label htmlFor="profile-username">
              用户名 <span className="text-destructive">*</span>
            </Label>
            <Input
              id="profile-username"
              value={form.username}
              maxLength={USERNAME_MAX}
              placeholder="4-20 个字符"
              onChange={(e) => set("username", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="profile-title">头衔</Label>
            <Input
              id="profile-title"
              value={form.title}
              maxLength={TITLE_MAX}
              placeholder="例如：自由职业者（可留空）"
              onChange={(e) => set("title", e.target.value)}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>性别</Label>
              <Select value={form.gender} onValueChange={(v) => set("gender", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_GENDER}>不填</SelectItem>
                  {GenderOptions.map((g) => (
                    <SelectItem key={g.value} value={String(g.value)}>
                      {g.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>生日</Label>
              <DatePicker
                value={form.birth}
                onChange={(v) => set("birth", v ?? "")}
                placeholder="选择生日"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="profile-introduce">个人简介</Label>
            <Textarea
              id="profile-introduce"
              value={form.introduce}
              maxLength={INTRODUCE_MAX}
              rows={3}
              placeholder="一句话介绍自己（可留空）"
              onChange={(e) => set("introduce", e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              {form.introduce.trim().length}/{INTRODUCE_MAX}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="profile-avatar">头像地址</Label>
            <div className="flex items-center gap-3">
              {/* 实时预览：输入框里改什么，这里就显示什么；
                  地址无效时会自动退回首字母头像，不用等保存。 */}
              <UserAvatar
                name={form.username}
                src={form.avatar}
                className="h-12 w-12 shrink-0"
                textClassName="text-base"
              />
              <div className="flex min-w-0 flex-1 items-center gap-1">
                <Input
                  id="profile-avatar"
                  value={form.avatar}
                  maxLength={AVATAR_MAX}
                  placeholder="https://example.com/avatar.png"
                  onChange={(e) => set("avatar", e.target.value)}
                />
                {form.avatar && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 shrink-0"
                    aria-label="清除头像"
                    title="清除头像"
                    onClick={() => set("avatar", "")}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              填入图片地址；留空则使用用户名首字母作为头像。
            </p>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <SheetFooter className="border-t p-6 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            保存
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
