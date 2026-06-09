import { request } from "@/lib/api";
import { AssetStatus, AssetType } from "@/lib/constant";

// ---------------- 类型 ----------------

export interface AssetListItem {
  id: string;
  asset_type: AssetType;
  name: string;
  currency: string;
  /** 当前价值，单位：分 */
  current_value: number;
  /** 初始价值，单位：分 */
  initial_value?: number | null;
  status: AssetStatus;
  category_id?: string | null;
  account_id?: string | null;
  purchase_date?: string | null;
  note?: string | null;
  tags?: string[] | null;
}

export interface AssetDetail extends AssetListItem {
  /** 特殊字段，根据类型可能存在 */
  symbol?: string | null;
  quantity?: number | null;
  cost_price?: number | null;
  latest_price?: number | null;
  address?: string | null;
  area?: number | null;
  brand?: string | null;
}

export interface AssetValuation {
  id: string;
  asset_id: string;
  /** 单位：分 */
  value: number;
  recorded_at: string;
  note?: string | null;
}

export interface AssetQueryPayload {
  asset_type?: AssetType;
  status?: AssetStatus;
  category_id?: string;
  account_id?: string;
  keyword?: string;
  page?: number;
  limit?: number;
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
  currency?: string;
  current_value: number;
  initial_value?: number;
  category_id?: string | null;
  account_id?: string | null;
  purchase_date?: string | null;
  note?: string | null;
  tags?: string[];
}

export interface UpdateAssetPayload {
  name?: string;
  category_id?: string | null;
  account_id?: string | null;
  current_value?: number;
  initial_value?: number;
  status?: AssetStatus;
  purchase_date?: string | null;
  note?: string | null;
  tags?: string[];
}

export interface CreateValuationPayload {
  value: number;
  recorded_at?: string;
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
