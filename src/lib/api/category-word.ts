import { request } from "@/lib/api";

export interface TransCategoryWordItem {
  id: number;
  word: string;
  priority: number;
}

export interface CreateTransCategoryWordPayload {
  word: string;
  priority?: number;
}

export const categoryWordApi = {
  list: () => request.get<TransCategoryWordItem[]>("/v1/transaction/category_word"),
  create: (payload: CreateTransCategoryWordPayload[]) =>
    request.post<unknown>("/v1/transaction/category_word", payload),
  remove: (ids: number[]) =>
    request.delete<unknown>("/v1/transaction/category_word", { json: ids }),
};
