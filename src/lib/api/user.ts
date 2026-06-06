import { queryOptions } from "@tanstack/react-query";
import { request } from "@/lib/api";

export interface UserProfile {
  id: number;
  username: string;
  account: string;
  birth: string;
  gender: 0 | 1;
  phone: string;
  email: string;
  introduce: string;
  ctime: number;
  utime: number;
  base_currency: string;
}

export const userApi = {
  getProfile: () => request.get<UserProfile>("/v1/me"),
};

export const userProfileQueryOptions = queryOptions({
  queryKey: ["user", "profile"],
  queryFn: () => userApi.getProfile(),
  staleTime: 5 * 60_000,
});
