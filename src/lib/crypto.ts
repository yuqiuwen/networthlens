// RSA-OAEP (SHA-256) 加密工具，用于请求体中的敏感字段（如密码）加密。
// 公钥来源：
//   1) 优先使用环境变量 VITE_RSA_PUBLIC_KEY（PEM 或纯 base64 DER）
//   2) 否则从后端 /v1/auth/pub-key 获取（响应可为 { public_key } 或纯字符串）

import { API_BASE_URL, type ApiEnvelope } from "./api";

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

async function importPublicKey(pemOrB64: string): Promise<CryptoKey> {
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

let publicKeyPromise: Promise<CryptoKey> | null = null;

async function fetchPublicKeyFromServer(): Promise<string> {
  const res = await fetch(`${API_BASE_URL}/v1/auth/pub-key`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  const text = await res.text();
  try {
    const json = JSON.parse(text) as ApiEnvelope<{ public_key?: string; pub_key?: string } | string>;
    if (json && typeof json === "object" && "code" in json) {
      if (json.code !== 0) throw new Error(json.errmsg || "获取公钥失败");
      const data = json.data;
      if (typeof data === "string") return data;
      const key = data?.public_key ?? data?.pub_key;
      if (!key) throw new Error("公钥响应缺少 public_key 字段");
      return key;
    }
  } catch {
    /* fallthrough — treat as raw pem */
  }
  return text;
}

export function getPublicKey(): Promise<CryptoKey> {
  if (publicKeyPromise) return publicKeyPromise;
  publicKeyPromise = (async () => {
    const envKey = import.meta.env.VITE_RSA_PUBLIC_KEY as string | undefined;
    const pem = envKey && envKey.trim() ? envKey : await fetchPublicKeyFromServer();
    return importPublicKey(pem);
  })().catch((err) => {
    publicKeyPromise = null;
    throw err;
  });
  return publicKeyPromise;
}

/** RSA-OAEP 加密，返回 base64 密文 */
export async function rsaEncrypt(plaintext: string): Promise<string> {
  const subtle = requireSubtle();
  const key = await getPublicKey();
  const encrypted = await subtle.encrypt(
    { name: "RSA-OAEP" },
    key,
    new TextEncoder().encode(plaintext),
  );
  return arrayBufferToBase64(encrypted);
}
