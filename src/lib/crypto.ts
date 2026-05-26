// RSA-OAEP (SHA-256) 加密工具，用于敏感字段（如密码）的请求体加密。
// 公钥通过 zustand store 全局缓存（1 小时），按 biz 区分。

function requireSubtle(): SubtleCrypto {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    throw new Error("WebCrypto 不可用：需要 HTTPS 或 localhost 环境");
  }
  return subtle;
}

function base64ToArrayBuffer(b64: string): ArrayBuffer {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem
    .replace(/-----BEGIN[^-]+-----/g, "")
    .replace(/-----END[^-]+-----/g, "")
    .replace(/\s+/g, "");
  return base64ToArrayBuffer(b64);
}

/** 从 PEM/Base64 SPKI 字符串导入 RSA-OAEP 公钥 */
export async function importPublicKeyFromPem(pemOrB64: string): Promise<CryptoKey> {
  const subtle = requireSubtle();
  const der = pemToArrayBuffer(pemOrB64);
  return subtle.importKey(
    "spki",
    der,
    { name: "RSA-OAEP", hash: "SHA-256" },
    false,
    ["encrypt"],
  );
}

/** 使用指定公钥进行 RSA-OAEP 加密，返回 base64 密文 */
export async function rsaEncryptWithKey(key: CryptoKey, plaintext: string): Promise<string> {
  const subtle = requireSubtle();
  const encrypted = await subtle.encrypt(
    { name: "RSA-OAEP" },
    key,
    new TextEncoder().encode(plaintext),
  );
  return arrayBufferToBase64(encrypted);
}

/** 按业务取公钥（带缓存）并加密 */
export async function encryptWithBiz(
  plaintext: string,
  biz: "user_pwd" = "user_pwd",
): Promise<string> {
  const { useRSAKeyStore } = await import("@/stores/rsa-key-store");
  const key = await useRSAKeyStore.getState().getPublicKey(biz);
  if (!key) throw new Error("RSA 公钥获取失败");
  return rsaEncryptWithKey(key, plaintext);
}
