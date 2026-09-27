import { request } from "@/lib/api";
import type { CategoryItem } from "@/lib/api/category";

export interface TransCategoryWordItem {
  id: number;
  words: string[];
  category: CategoryItem;
}

export interface CreateTransCategoryWordPayload {
  category_id: string;
  words: string[];
}

export const categoryWordApi = {
  list: () => request.get<TransCategoryWordItem[]>("/v1/transaction/category_word"),
  create: (payload: CreateTransCategoryWordPayload) =>
    request.post<unknown>("/v1/transaction/category_word", payload),
  remove: (ids: number[]) =>
    request.delete<unknown>("/v1/transaction/category_word", { json: ids }),
};
