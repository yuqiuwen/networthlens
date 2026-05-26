// RSA 公钥缓存 Store（zustand）
// 缓存策略：1 小时；缓存键：${biz}:public_key
import { create } from "zustand";
import { getRSAPublicKeyApi } from "@/lib/api";
import { importPublicKeyFromPem } from "@/lib/crypto";

export type RSABiz = "user_pwd";

interface RSAKeyCache {
  key: CryptoKey;
  expiresAt: number;
}

interface RSAKeyStore {
  cache: Record<string, RSAKeyCache>;
  getPublicKey: (biz: RSABiz) => Promise<CryptoKey | null>;
  clearCache: () => void;
  clearExpiredCache: () => void;
}

const DEFAULT_CACHE_DURATION = 60 * 60 * 1000;

// 防止并发请求时同一 biz 重复发请求
const inflight: Record<string, Promise<CryptoKey | null> | undefined> = {};

export const useRSAKeyStore = create<RSAKeyStore>((set, get) => ({
  cache: {},

  getPublicKey: async (biz) => {
    const cacheKey = `${biz}:public_key`;
    const now = Date.now();
    const cached = get().cache[cacheKey];
    if (cached && cached.expiresAt > now) return cached.key;

    if (inflight[cacheKey]) return inflight[cacheKey]!;

    inflight[cacheKey] = (async () => {
      try {
        const res = await getRSAPublicKeyApi(biz);
        if (!res?.public_key) return null;
        const key = await importPublicKeyFromPem(res.public_key);
        set((state) => ({
          cache: {
            ...state.cache,
            [cacheKey]: { key, expiresAt: Date.now() + DEFAULT_CACHE_DURATION },
          },
        }));
        return key;
      } catch (err) {
        console.error(`[RSA Cache] 获取公钥失败: ${cacheKey}`, err);
        return null;
      } finally {
        inflight[cacheKey] = undefined;
      }
    })();

    return inflight[cacheKey]!;
  },

  clearCache: () => set({ cache: {} }),

  clearExpiredCache: () => {
    const now = Date.now();
    set((state) => {
      const next: Record<string, RSAKeyCache> = {};
      for (const [k, v] of Object.entries(state.cache)) {
        if (v.expiresAt > now) next[k] = v;
      }
      return { cache: next };
    });
  },
}));
