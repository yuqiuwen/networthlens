import { request } from "@/lib/api";
import { CategoryType } from "@/lib/constant";

export interface CategoryItem {
  id: string;
  category_type: CategoryType;
  parent_id: string | null;
  name: string;
  code?: string | null;
  icon: string | null;
  color: string | null;
  sort_no: number;
}

export interface CategoryQueryPayload {
  category_type?: CategoryType;
}

export interface CreateCategoryPayload {
  category_type: CategoryType;
  parent_id?: string | null;
  name: string;
  code?: string | null;
  icon?: string | null;
  color?: string | null;
  sort_no?: number;
}

export interface UpdateCategoryPayload {
  parent_id?: string | null;
  name?: string;
  code?: string | null;
  icon?: string | null;
  color?: string | null;
  sort_no?: number;
}

export const categoryApi = {
  list: (payload: CategoryQueryPayload = {}) =>
    request.get<CategoryItem[]>("/v1/category", { params: payload }),
  create: (payload: CreateCategoryPayload) => request.post<string>("/v1/category", payload),
  update: (id: string, payload: UpdateCategoryPayload) =>
    request.put<boolean>(`/v1/category/${id}`, payload),
  remove: (id: string) => request.delete<boolean>(`/v1/category/${id}`),
};
