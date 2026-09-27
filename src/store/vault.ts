import { deriveKey, fromB64, generateKey, KDF_ITERATIONS, makeBackup, open, randomBytes, seal, toB64, type BackupFile, type Sealed } from './crypto';
import { kvBatch, kvDel, kvGet, kvSet } from './db';
import type { AppData } from './types';

interface Meta {
  salt: string;
  iterations: number;
  createdAt: string;
  bioCredId?: string;
  /** opening the app needs no password; the vault is sealed with a device-only key */
  noPassword?: boolean;
}

interface Session {
  key: CryptoKey;
  /** password-derived key backups are sealed with (differs from `key` without a password) */
  backupKey?: CryptoKey;
  salt: Uint8Array;
  iterations: number;
}

let session: Session | null = null;

export async function hasVault(): Promise<boolean> {
  return !!(await kvGet<Meta>('meta'));
}

export async function createVault(password: string, data: AppData): Promise<void> {
  const salt = randomBytes(16);
  const key = await deriveKey(password, salt);
  await kvSet('meta', { salt: toB64(salt), iterations: KDF_ITERATIONS, createdAt: new Date().toISOString() } satisfies Meta);
  session = { key, salt, iterations: KDF_ITERATIONS };
  await saveVault(data);
}

export async function unlockWithPassword(password: string): Promise<AppData> {
  const meta = await kvGet<Meta>('meta');
  const sealed = await kvGet<Sealed>('vault');
  if (!meta || !sealed) throw new Error('no-vault');
  const salt = fromB64(meta.salt);
  const key = await deriveKey(password, salt, meta.iterations);
  if (meta.noPassword) {
    // password is off, but the (backup) password still proves who you are
    const check = await kvGet<Sealed>('pwCheck');
    if (!check) throw new Error('no-check');
    await open(key, check);
    return unlockAuto();
  }
  const data = await open<AppData>(key, sealed); // throws on wrong password
  session = { key, salt, iterations: meta.iterations };
  if (meta.bioCredId) await kvSet('bioKey', key); // keep the quick-unlock key in sync
  return data;
}

export async function saveVault(data: AppData): Promise<void> {
  if (!session) throw new Error('locked');
  await kvSet('vault', await seal(session.key, data));
}

export function lock(): void {
  session = null;
}

export function isUnlocked(): boolean {
  return !!session;
}

export async function backupFile(data: AppData): Promise<BackupFile> {
  if (!session) throw new Error('locked');
  return makeBackup(session.backupKey ?? session.key, session.salt, session.iterations, data);
}

export async function changePassword(oldPassword: string, newPassword: string, data: AppData): Promise<void> {
  await unlockWithPassword(oldPassword);
  const salt = randomBytes(16);
  const key = await deriveKey(newPassword, salt);
  const meta = (await kvGet<Meta>('meta'))!;
  const vault = await seal(key, data);
  await kvBatch({ vault, meta: { ...meta, noPassword: false, salt: toB64(salt), iterations: KDF_ITERATIONS }, ...(meta.bioCredId ? { bioKey: key } : {}) }, ['autoKey', 'backupKey', 'pwCheck']);
  session = { key, salt, iterations: KDF_ITERATIONS };
}

/** Replace the vault with a restored backup, keeping the backup's password. */
export async function adoptBackup(file: BackupFile, password: string, data: AppData): Promise<void> {
  const salt = fromB64(file.salt);
  const key = await deriveKey(password, salt, file.iterations);
  const meta = await kvGet<Meta>('meta');
  const vault = await seal(key, data);
  await kvBatch({ vault, meta: { salt: file.salt, iterations: file.iterations, createdAt: meta?.createdAt ?? new Date().toISOString() } satisfies Meta }, ['bioKey', 'autoKey', 'backupKey', 'pwCheck']);
  session = { key, salt, iterations: file.iterations };
}

export async function wipeAll(): Promise<void> {
  session = null;
  await kvBatch({}, ['vault', 'meta', 'bioKey', 'autoKey', 'backupKey', 'pwCheck']);
}

// ---- optional: no password to open the app ----

export async function noPasswordEnabled(): Promise<boolean> {
  return !!(await kvGet<Meta>('meta'))?.noPassword;
}

/** Open without a password (only when the user turned the password off). */
export async function unlockAuto(): Promise<AppData> {
  const meta = await kvGet<Meta>('meta');
  const key = await kvGet<CryptoKey>('autoKey');
  const sealed = await kvGet<Sealed>('vault');
  if (!meta?.noPassword || !key || !sealed) throw new Error('password-required');
  const data = await open<AppData>(key, sealed);
  session = { key, backupKey: (await kvGet<CryptoKey>('backupKey')) ?? undefined, salt: fromB64(meta.salt), iterations: meta.iterations };
  return data;
}

/** Stop asking for the password. Data stays encrypted with a key kept on this device;
 *  backups keep using the current password so they can still be restored elsewhere. */
export async function disablePassword(data: AppData): Promise<void> {
  if (!session) throw new Error('locked');
  const meta = (await kvGet<Meta>('meta'))!;
  if (meta.noPassword) return;
  const deviceKey = await generateKey();
  const backupKey = session.key;
  const vault = await seal(deviceKey, data);
  // everything in one transaction, so a crash can never leave keys and data out of step
  const pwCheck = await seal(backupKey, 1);
  await kvBatch({ vault, meta: { ...meta, noPassword: true }, autoKey: deviceKey, backupKey, pwCheck, ...(meta.bioCredId ? { bioKey: deviceKey } : {}) });
  session = { ...session, key: deviceKey, backupKey };
}

/** Ask for a password again (a new one, used for opening the app and for backups). */
export async function enablePassword(password: string, data: AppData): Promise<void> {
  if (!session) throw new Error('locked');
  const salt = randomBytes(16);
  const key = await deriveKey(password, salt);
  const meta = (await kvGet<Meta>('meta'))!;
  const vault = await seal(key, data);
  await kvBatch({ vault, meta: { ...meta, noPassword: false, salt: toB64(salt), iterations: KDF_ITERATIONS }, ...(meta.bioCredId ? { bioKey: key } : {}) }, ['autoKey', 'backupKey', 'pwCheck']);
  session = { key, salt, iterations: KDF_ITERATIONS };
}

// ---- Face ID / Touch ID quick unlock ----
// A platform passkey gates access to a non-extractable copy of the vault key kept on this device.

export function bioSupported(): boolean {
  return typeof window !== 'undefined' && !!window.PublicKeyCredential && !!navigator.credentials;
}

export async function bioEnabled(): Promise<boolean> {
  const meta = await kvGet<Meta>('meta');
  return !!meta?.bioCredId && !!(await kvGet<CryptoKey>('bioKey'));
}

export async function enableBio(userName: string): Promise<void> {
  if (!session) throw new Error('locked');
  const cred = (await navigator.credentials.create({
    publicKey: {
      challenge: randomBytes(32) as BufferSource,
      rp: { name: 'My Finance Bro' },
      user: { id: randomBytes(16) as BufferSource, name: userName || 'me', displayName: userName || 'me' },
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 },
        { type: 'public-key', alg: -257 }
      ],
      authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'preferred' },
      timeout: 60000
    }
  })) as PublicKeyCredential | null;
  if (!cred) throw new Error('cancelled');
  const meta = (await kvGet<Meta>('meta'))!;
  await kvSet('meta', { ...meta, bioCredId: toB64(new Uint8Array(cred.rawId)) });
  await kvSet('bioKey', session.key);
}

export async function disableBio(): Promise<void> {
  const meta = await kvGet<Meta>('meta');
  if (meta) await kvSet('meta', { ...meta, bioCredId: undefined });
  await kvDel('bioKey');
}

/** Ask for Face ID before revealing secrets (when quick unlock is set up). */
export async function verifyUser(): Promise<boolean> {
  const meta = await kvGet<Meta>('meta');
  if (!meta?.bioCredId) return true;
  try {
    const a = await navigator.credentials.get({
      publicKey: {
        challenge: randomBytes(32) as BufferSource,
        allowCredentials: [{ type: 'public-key', id: fromB64(meta.bioCredId) as BufferSource }],
        userVerification: 'required',
        timeout: 60000
      }
    });
    return !!a;
  } catch {
    return false;
  }
}

export async function unlockWithBio(): Promise<AppData> {
  const meta = await kvGet<Meta>('meta');
  const key = await kvGet<CryptoKey>('bioKey');
  const sealed = await kvGet<Sealed>('vault');
  if (!meta?.bioCredId || !key || !sealed) throw new Error('bio-off');
  const assertion = await navigator.credentials.get({
    publicKey: {
      challenge: randomBytes(32) as BufferSource,
      allowCredentials: [{ type: 'public-key', id: fromB64(meta.bioCredId) as BufferSource }],
      userVerification: 'required',
      timeout: 60000
    }
  });
  if (!assertion) throw new Error('cancelled');
  const data = await open<AppData>(key, sealed);
  session = { key, backupKey: meta.noPassword ? (await kvGet<CryptoKey>('backupKey')) ?? undefined : undefined, salt: fromB64(meta.salt), iterations: meta.iterations };
  return data;
}
