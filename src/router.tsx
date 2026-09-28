import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { routeTree } from "./routeTree.gen";

const showError = (err: unknown) => {
  if (typeof window === "undefined") return;
  const msg = (err as Error)?.message;
  if (msg) toast.error(msg, { id: msg });
};

export const getRouter = () => {
  const queryClient = new QueryClient({
    // 全局兜底：查询失败统一弹出后端 errmsg
    queryCache: new QueryCache({ onError: showError }),
    // 未自定义 onError 的 mutation 也统一弹窗
    mutationCache: new MutationCache({
      onError: (err, _v, _c, mutation) => {
        if (!mutation.options.onError) showError(err);
      },
    }),
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
