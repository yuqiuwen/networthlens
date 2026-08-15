import { request } from "@/lib/api";

export interface SecretStatus {
  configured: boolean;
}

export interface SecretCodePayload {
  code: string;
}

export const secretApi = {
  status: () => request.get<SecretStatus>("/v1/secret"),
  setDefault: (payload: SecretCodePayload) => request.post<boolean>("/v1/secret", payload),
  verify: async (payload: SecretCodePayload) => {
    const { encryptWithBiz } = await import("@/lib/crypto");
    const encryptedCode = await encryptWithBiz(payload.code, "user_pwd");
    await request.post<boolean>("/v1/secret/verify", { code: encryptedCode });
    return encryptedCode;
  },
  remove: () => request.delete<boolean>("/v1/secret"),
};
