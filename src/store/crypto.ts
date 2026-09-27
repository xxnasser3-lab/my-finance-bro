// All encryption happens in the browser with the Web Crypto API.
// The password never leaves the device and is never stored.

const enc = new TextEncoder();
const dec = new TextDecoder();

export const KDF_ITERATIONS = 310_000;

export function randomBytes(n: number): Uint8Array {
  const b = new Uint8Array(n);
  crypto.getRandomValues(b);
  return b;
}

export function toB64(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

export function fromB64(b64: string): Uint8Array {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

export async function deriveKey(password: string, salt: Uint8Array, iterations = KDF_ITERATIONS): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/** A random AES key that never leaves this device (used when the app has no password). */
export async function generateKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

export interface Sealed {
  iv: string;
  ct: string;
}

export async function seal(key: CryptoKey, value: unknown): Promise<Sealed> {
  const iv = randomBytes(12);
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv as BufferSource }, key, enc.encode(JSON.stringify(value)));
  return { iv: toB64(iv), ct: toB64(new Uint8Array(ct)) };
}

/** Throws if the key is wrong or the data was tampered with. */
export async function open<T>(key: CryptoKey, sealed: Sealed): Promise<T> {
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(sealed.iv) as BufferSource }, key, fromB64(sealed.ct) as BufferSource);
  return JSON.parse(dec.decode(pt)) as T;
}

/** Self-contained backup file: anyone with the password can restore it on any device. */
export interface BackupFile {
  app: 'my-finance-bro';
  format: 1;
  createdAt: string;
  salt: string;
  iterations: number;
  iv: string;
  ct: string;
}

export async function makeBackup(key: CryptoKey, salt: Uint8Array, iterations: number, data: unknown): Promise<BackupFile> {
  const sealed = await seal(key, data);
  return { app: 'my-finance-bro', format: 1, createdAt: new Date().toISOString(), salt: toB64(salt), iterations, ...sealed };
}

export async function readBackup<T>(file: BackupFile, password: string): Promise<T> {
  if (file.app !== 'my-finance-bro') throw new Error('not-a-backup');
  const key = await deriveKey(password, fromB64(file.salt), file.iterations);
  return open<T>(key, { iv: file.iv, ct: file.ct });
}
