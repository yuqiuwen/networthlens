// 金额换算与展示工具。
//
// 约定：接口层金额一律是「分」（整数），展示与表单输入用「元」。

/** 分 -> 元（数字） */
export function centsToYuan(cents: number | null | undefined): number {
  return (cents ?? 0) / 100;
}

/** 元 -> 分（四舍五入，规避 0.1 + 0.2 这类浮点误差） */
export function yuanToCents(yuan: string | number | null | undefined): number {
  const n = Number(yuan ?? 0);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

/** 分 -> 货币字符串，如 ¥1,234.50 */
export function formatCents(cents: number | null | undefined, currency = "CNY"): string {
  const value = centsToYuan(cents);
  try {
    return new Intl.NumberFormat("zh-CN", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

/** 分 -> 紧凑字符串（万 / 亿），用于汇总条等空间有限的位置 */
export function formatCentsCompact(cents: number | null | undefined): string {
  const value = centsToYuan(cents);
  const abs = Math.abs(value);
  if (abs >= 1_0000_0000) return `¥${(value / 1_0000_0000).toFixed(2)}亿`;
  if (abs >= 1_0000) return `¥${(value / 1_0000).toFixed(2)}万`;
  return `¥${value.toLocaleString("zh-CN", { maximumFractionDigits: 2 })}`;
}

/**
 * 月度建议储蓄（分）。
 *
 * 与后端 GoalService._derive 的算法保持一致（需求文档 §7.2）：
 * 剩余月数按 30 天/月估算，结果向上取整到「元」，避免出现 3333.33 这种数字。
 * 仅用于表单内的实时预览；已落库目标一律用后端返回值。
 */
export function monthlySuggestedSaving(
  remainingCents: number,
  deadline: string | null | undefined,
  today = new Date(),
): number | null {
  if (!deadline || remainingCents <= 0) return null;

  const end = new Date(`${deadline}T00:00:00`);
  if (Number.isNaN(end.getTime())) return null;

  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const days = Math.round((end.getTime() - start.getTime()) / 86_400_000);
  if (days <= 0) return null;

  const months = Math.max(Math.ceil(days / 30), 1);
  return Math.ceil(remainingCents / months / 100) * 100;
}
