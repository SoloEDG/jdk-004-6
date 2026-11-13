/**
 * Deterministic 32-bit FNV-1a hash. Used for daily seeds and payload checksums;
 * intentionally platform-independent so a code means the same thing in every
 * browser and in node-based tests.
 */
export function fnv1aHex(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  const g = globalThis as { btoa?: (s: string) => string };
  if (typeof g.btoa === "function") return g.btoa(binary);
  // Node fallback (kept branch-local so no @types/node dependency is required).
  const nodeBuffer = (globalThis as { Buffer?: { from: (b: Uint8Array) => { toString: (e: string) => string } } }).Buffer;
  if (nodeBuffer) return nodeBuffer.from(bytes).toString("base64");
  throw new Error("no base64 encoder available");
}

function base64ToBytes(b64: string): Uint8Array {
  const g = globalThis as { atob?: (s: string) => string };
  if (typeof g.atob === "function") {
    const binary = g.atob(b64);
    return Uint8Array.from(binary, (c) => c.charCodeAt(0));
  }
  const nodeBuffer = (globalThis as { Buffer?: { from: (s: string, e: string) => { length: number; [i: number]: number } } }).Buffer;
  if (nodeBuffer) {
    const buf = nodeBuffer.from(b64, "base64");
    return Uint8Array.from(buf as unknown as number[]);
  }
  throw new Error("no base64 decoder available");
}

/** UTF-8 safe base64url encoding. */
export function base64UrlEncode(input: string): string {
  const bytes = new TextEncoder().encode(input);
  return bytesToBase64(bytes)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/** UTF-8 safe base64url decoding. Throws on malformed padding/characters. */
export function base64UrlDecode(input: string): string {
  if (!/^[A-Za-z0-9_-]+$/.test(input)) throw new Error("invalid base64url");
  const b64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = b64.padEnd(b64.length + ((4 - (b64.length % 4)) % 4), "=");
  const bytes = base64ToBytes(padded);
  return new TextDecoder().decode(bytes);
}
