import { request } from "@/lib/api";
import {
  AssetStatus,
  AssetType,
  AssetValuationMethod,
  AssetValuationSource,
} from "@/lib/constant";

// ---------------- 类型 ----------------

export interface AssetListItem {
  id: string;
  asset_type: AssetType;
  name: string;
  /** 当前价值，单位：分 */
  current_value: number;
  currency: string;
  status: AssetStatus;
}

export interface AssetDetail {
  id: string;
  asset_type: AssetType;
  name: string;

  quantity: number;
  unit: string | null;

  /** 购入金额，单位：分 */
  purchase_amount: number;
  /** 当前价值，单位：分 */
  current_value: number;

  /** 单价（货币原始单位，浮点） */
  unit_price: number | null;

  currency: string;
  /** YYYY-MM-DD */
  purchase_date: string | null;

  valuation_method: AssetValuationMethod;
  status: AssetStatus;

  image_urls: string[];
  extra_info: Record<string, unknown> | null;

  note: string | null;
}

export interface AssetValuation {
  id: string;
  /** 估值金额，单位：分 */
  valuation: number;
  /** YYYY-MM-DD */
  valuation_date: string;
  source: AssetValuationSource;
  note?: string | null;
}

export interface AssetQueryPayload {
  page?: number;
  limit?: number;
  asset_type?: AssetType;
  status?: AssetStatus;
}

export interface PageResp<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateAssetPayload {
  asset_type: AssetType;
  name: string;

  quantity?: number;
  unit?: string | null;

  purchase_amount?: number;
  current_value?: number;

  unit_price?: number | null;

  currency?: string;
  purchase_date?: string | null;

  valuation_method?: AssetValuationMethod;

  image_urls?: string[];
  extra_info?: Record<string, unknown> | null;

  note?: string | null;
}

export interface UpdateAssetPayload {
  name?: string;
  quantity?: number;
  purchase_amount?: number;
  current_value?: number;
  valuation_method?: AssetValuationMethod;
  status?: AssetStatus;
  note?: string | null;
}

export interface CreateValuationPayload {
  /** 单位：分 */
  valuation: number;
  /** YYYY-MM-DD */
  valuation_date: string;
  source: AssetValuationSource;
  note?: string | null;
}

// ---------------- API ----------------

export const assetApi = {
  list: (payload: AssetQueryPayload = {}) =>
    request.get<PageResp<AssetListItem> | AssetListItem[]>("/v1/asset", { params: payload }),
  get: (id: string) => request.get<AssetDetail>(`/v1/asset/${id}`),
  create: (payload: CreateAssetPayload) => request.post<string>("/v1/asset", payload),
  update: (id: string, payload: UpdateAssetPayload) =>
    request.put<boolean>(`/v1/asset/${id}`, payload),
  remove: (id: string) => request.delete<boolean>(`/v1/asset/${id}`),
  listValuations: (id: string) =>
    request.get<AssetValuation[]>(`/v1/asset/${id}/valuations`),
  addValuation: (id: string, payload: CreateValuationPayload) =>
    request.post<string>(`/v1/asset/${id}/valuations`, payload),
};
