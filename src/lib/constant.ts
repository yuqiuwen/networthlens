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