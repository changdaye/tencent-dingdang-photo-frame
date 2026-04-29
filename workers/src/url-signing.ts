import type { WorkerConfig } from './types';

function toHex(data: ArrayBuffer): string {
  return [...new Uint8Array(data)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function hmacSha256Hex(key: string, message: string): Promise<string> {
  const cryptoKey = await crypto.subtle.importKey('raw', new TextEncoder().encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(message));
  return toHex(signature);
}

function timingSafeEqual(a: string, b: string) {
  if (a.length != b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i += 1) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}

export async function signImagePath(config: WorkerConfig, username: string, key: string, updatedAt: string) {
  const payload = `${username}
${key}
${updatedAt}`;
  return hmacSha256Hex(config.imageSigningSecret, payload);
}

export async function verifyImageSignature(config: WorkerConfig, username: string, key: string, updatedAt: string, signature: string) {
  const expected = await signImagePath(config, username, key, updatedAt);
  return timingSafeEqual(expected, signature);
}
