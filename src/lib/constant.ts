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

// 流水类型
export enum TransactionType {
  INCOME = 1,
  EXPENSE = 2,
  TRANSFER = 3,
  BORROW_IN = 4,
  BORROW_OUT = 5,
  REPAYMENT = 6,
  ADJUST = 7,
  REFUND = 8,
}

export const TransactionTypeOptions = [
  { label: "收入", value: TransactionType.INCOME },
  { label: "支出", value: TransactionType.EXPENSE },
  { label: "转账", value: TransactionType.TRANSFER },
  { label: "借入", value: TransactionType.BORROW_IN },
  { label: "借出", value: TransactionType.BORROW_OUT },
  { label: "还款", value: TransactionType.REPAYMENT },
  { label: "调整", value: TransactionType.ADJUST },
  { label: "冲减消费", value: TransactionType.REFUND },
];

// 流水渠道
export enum TransactionChannel {
  OTHER = 0,
  WX = 1,
  ALIPAY = 2,
  ZS_BANK = 3,
  CASH = 4,
}

export const TransactionChannelOptions = [
  { label: "微信", value: TransactionChannel.WX },
  { label: "支付宝", value: TransactionChannel.ALIPAY },
  { label: "网银", value: TransactionChannel.ZS_BANK },
  { label: "现金", value: TransactionChannel.CASH },
  { label: "其他", value: TransactionChannel.OTHER },
];

export const TransactionChannelMap = defineMap(TransactionChannelOptions, "value");

export const TransactionTypeMap = defineMap(TransactionTypeOptions, "value");

export enum TransactionStatus {
  NORMAL = 1,
  REVOKED = 2,
  REFUNDED = 3,
}

// ------------------------------------------------------------

// ==================== 资产类型 ====================
export enum AssetType {
    REAL_ESTATE = 1,    // 房产
    VEHICLE = 2,        // 车辆
    COLLECTIBLE = 3,    // 收藏品
    OTHER = 4,          // 其他
    CAMERA = 5,         // 相机
    MOBILE = 6,         // 手机
    SHOE = 7,           // 鞋
    DRESS = 8,          // 服装
    JEWELRY = 9,        // 珠宝
    OTHER_DIGITAL = 10, // 其他数码
  }
  
  export const AssetTypeOptions = [
    { label: "房产", value: AssetType.REAL_ESTATE, tone: "text-indigo-500", icon: "🏠" },
    { label: "车辆", value: AssetType.VEHICLE, tone: "text-cyan-500", icon: "🚗" },
    { label: "收藏品", value: AssetType.COLLECTIBLE, tone: "text-amber-500", icon: "🏺" },
    { label: "相机", value: AssetType.CAMERA, tone: "text-purple-500", icon: "📷" },
    { label: "手机", value: AssetType.MOBILE, tone: "text-sky-500", icon: "📱" },
    { label: "鞋", value: AssetType.SHOE, tone: "text-rose-500", icon: "👟" },
    { label: "服装", value: AssetType.DRESS, tone: "text-pink-500", icon: "👗" },
    { label: "珠宝", value: AssetType.JEWELRY, tone: "text-yellow-600", icon: "💎" },
    { label: "其他数码", value: AssetType.OTHER_DIGITAL, tone: "text-gray-500", icon: "🖥️" },
    { label: "其他", value: AssetType.OTHER, tone: "text-muted-foreground", icon: "📦" },
  ];
  
  export const AssetTypeMap = defineMap(AssetTypeOptions, "value", ["label", "tone", "icon"]);
  
  // ==================== 资产状态（与后端 AssetStatus 对齐） ====================
  export enum AssetStatus {
    NORMAL = 1, // 正常
    SOLD = 2,   // 已出售
    FROZEN = 3, // 冻结
  }
  
  export const AssetStatusOptions = [
    { label: "正常", value: AssetStatus.NORMAL, color: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300" },
    { label: "已出售", value: AssetStatus.SOLD, color: "bg-muted text-muted-foreground" },
    { label: "冻结", value: AssetStatus.FROZEN, color: "bg-amber-500/15 text-amber-600 dark:text-amber-300" },
  ];
  
  export const AssetStatusMap = defineMap(AssetStatusOptions, "value", ["label", "color"]);
  
  // ==================== 估值方式（与后端 AssetValuationMethod 对齐） ====================
  export enum AssetValuationMethod {
    MANUAL = 1,   // 手动
    MARKET = 2,   // 市场
    ESTIMATE = 3, // 估算
  }
  
  export const AssetValuationMethodOptions = [
    { label: "手动", value: AssetValuationMethod.MANUAL },
    { label: "市场", value: AssetValuationMethod.MARKET },
    { label: "估算", value: AssetValuationMethod.ESTIMATE },
  ];
  
  export const AssetValuationMethodMap = defineMap(AssetValuationMethodOptions, "value", ["label"]);
  
  // ==================== 估值来源（与后端 AssetValuationSource 对齐） ====================
  export enum AssetValuationSource {
    MANUAL = 1, // 手动
    IMPORT = 2, // 导入
    SYSTEM = 3, // 系统
  }
  
  export const AssetValuationSourceOptions = [
    { label: "手动", value: AssetValuationSource.MANUAL },
    { label: "导入", value: AssetValuationSource.IMPORT },
    { label: "系统", value: AssetValuationSource.SYSTEM },
  ];
  
  export const AssetValuationSourceMap = defineMap(AssetValuationSourceOptions, "value", ["label"]);
