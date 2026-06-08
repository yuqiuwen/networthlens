import { defineMap } from "@/utils/enum";

// 账户类型枚举
export enum AccountType {
    CASH = 1,
    BANK = 2,
    PAYMENT = 3,
    CREDIT_CARD = 4,
    SECURITIES = 5,
    WEALTH = 6,
    OTHER = 7,
}

// 账户类型选项（用于下拉框等）
export const AccountTypeOptions = [
    { label: "现金", value: AccountType.CASH },
    { label: "银行存款", value: AccountType.BANK },
    { label: "支付账户", value: AccountType.PAYMENT },
    { label: "信用卡", value: AccountType.CREDIT_CARD },
    { label: "证券账户", value: AccountType.SECURITIES },
    { label: "理财账户", value: AccountType.WEALTH },
    { label: "其他", value: AccountType.OTHER },
];

// 账户类型映射表（value -> label）
export const AccountTypeMap = defineMap(AccountTypeOptions, "value");

// ------------------------------------------------------------

// 账户状态枚举
export enum AccountStatus {
    NORMAL = 1,
    FROZEN = 2,
    CLOSED = 3,
}

// 账户状态选项
export const AccountStatusOptions = [
    { label: "正常", value: AccountStatus.NORMAL },
    { label: "冻结", value: AccountStatus.FROZEN },
    { label: "关闭", value: AccountStatus.CLOSED },
];

// 账户状态映射表
export const AccountStatusMap = defineMap(AccountStatusOptions, "value");

// ------------------------------------------------------------

// 分类类型
export enum CategoryType {
  INCOME = 1,
  EXPENSE = 2,
  ASSET = 3,
  LIABILITY = 4,
  OTHER = 5,
}

export const CategoryTypeOptions = [
  { label: "收入", value: CategoryType.INCOME, tone: "text-emerald-500" },
  { label: "支出", value: CategoryType.EXPENSE, tone: "text-rose-500" },
  { label: "资产", value: CategoryType.ASSET, tone: "text-sky-500" },
  { label: "负债", value: CategoryType.LIABILITY, tone: "text-amber-500" },
  { label: "其他", value: CategoryType.OTHER, tone: "text-muted-foreground" },
];

export const CategoryTypeMap = defineMap(CategoryTypeOptions, "value");

// ------------------------------------------------------------

// 资产类型
export enum AssetType {
  CASH = 1,
  BANK = 2,
  PAYMENT = 3,
  FUND = 4,
  STOCK = 5,
  BOND = 6,
  GOLD = 7,
  CRYPTO = 8,
  REAL_ESTATE = 9,
  VEHICLE = 10,
  OTHER = 11,
}

export const AssetTypeOptions = [
  { label: "现金", value: AssetType.CASH, tone: "text-emerald-500", icon: "💵" },
  { label: "银行存款", value: AssetType.BANK, tone: "text-sky-500", icon: "🏦" },
  { label: "支付账户", value: AssetType.PAYMENT, tone: "text-blue-500", icon: "📱" },
  { label: "基金", value: AssetType.FUND, tone: "text-violet-500", icon: "📊" },
  { label: "股票", value: AssetType.STOCK, tone: "text-rose-500", icon: "📈" },
  { label: "债券", value: AssetType.BOND, tone: "text-amber-500", icon: "📜" },
  { label: "黄金", value: AssetType.GOLD, tone: "text-yellow-500", icon: "🪙" },
  { label: "数字资产", value: AssetType.CRYPTO, tone: "text-orange-500", icon: "₿" },
  { label: "房产", value: AssetType.REAL_ESTATE, tone: "text-indigo-500", icon: "🏠" },
  { label: "车辆", value: AssetType.VEHICLE, tone: "text-cyan-500", icon: "🚗" },
  { label: "其他", value: AssetType.OTHER, tone: "text-muted-foreground", icon: "📦" },
];

export const AssetTypeMap = defineMap(AssetTypeOptions, "value");

// 资产状态
export enum AssetStatus {
  NORMAL = 1,
  FROZEN = 2,
  SOLD = 3,
  CLOSED = 4,
  DELETED = 5,
}

export const AssetStatusOptions = [
  { label: "正常", value: AssetStatus.NORMAL, color: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300" },
  { label: "冻结", value: AssetStatus.FROZEN, color: "bg-amber-500/15 text-amber-600 dark:text-amber-300" },
  { label: "已出售", value: AssetStatus.SOLD, color: "bg-muted text-muted-foreground" },
  { label: "已注销", value: AssetStatus.CLOSED, color: "bg-muted text-muted-foreground" },
  { label: "已删除", value: AssetStatus.DELETED, color: "bg-destructive/15 text-destructive" },
];

export const AssetStatusMap = defineMap(AssetStatusOptions, "value");