// Google Drive backup using the user's own Google account.
// Files live in the hidden "appDataFolder" that only this app can see.
// Everything uploaded is already encrypted with the user's password.

import type { BackupFile } from '../store/crypto';

const SCOPE = 'https://www.googleapis.com/auth/drive.appdata';
const KEEP = 30;

interface TokenResponse {
  access_token?: string;
  expires_in?: number;
  error?: string;
}

interface TokenClient {
  requestAccessToken: (o?: { prompt?: string }) => void;
  callback: (r: TokenResponse) => void;
}

declare global {
  interface Window {
    google?: { accounts: { oauth2: { initTokenClient: (cfg: { client_id: string; scope: string; callback: (r: TokenResponse) => void }) => TokenClient } } };
  }
}

let token: { value: string; exp: number } | null = null;
let gisLoading: Promise<void> | null = null;

function loadGis(): Promise<void> {
  if (window.google?.accounts) return Promise.resolve();
  if (!gisLoading) {
    gisLoading = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client';
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => {
        gisLoading = null;
        reject(new Error('gis-load'));
      };
      document.head.appendChild(s);
    });
  }
  return gisLoading;
}

async function getToken(clientId: string): Promise<string> {
  if (token && token.exp > Date.now() + 60000) return token.value;
  await loadGis();
  return new Promise((resolve, reject) => {
    const client = window.google!.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPE,
      callback: (r) => {
        if (r.error || !r.access_token) return reject(new Error(r.error ?? 'no-token'));
        token = { value: r.access_token, exp: Date.now() + (r.expires_in ?? 3600) * 1000 };
        resolve(r.access_token);
      }
    });
    client.requestAccessToken({ prompt: token ? '' : undefined });
  });
}

async function api(clientId: string, url: string, init: RequestInit = {}): Promise<Response> {
  const tk = await getToken(clientId);
  const res = await fetch(url, { ...init, headers: { ...(init.headers ?? {}), Authorization: 'Bearer ' + tk } });
  if (!res.ok) throw new Error('drive-' + res.status);
  return res;
}

interface DriveFile {
  id: string;
  name: string;
  createdTime: string;
}

async function list(clientId: string): Promise<DriveFile[]> {
  const q = encodeURIComponent("name contains 'finance-backup-'");
  const res = await api(clientId, `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=${q}&orderBy=createdTime desc&pageSize=100&fields=files(id,name,createdTime)`);
  return ((await res.json()) as { files: DriveFile[] }).files ?? [];
}

export async function driveUpload(clientId: string, backup: BackupFile): Promise<void> {
  const meta = { name: `finance-backup-${backup.createdAt.replace(/[:.]/g, '-')}.json`, parents: ['appDataFolder'], mimeType: 'application/json' };
  const boundary = 'mfb' + Math.random().toString(36).slice(2);
  const body = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(backup)}\r\n--${boundary}--`;
  await api(clientId, 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
    method: 'POST',
    headers: { 'Content-Type': 'multipart/related; boundary=' + boundary },
    body
  });
  const files = await list(clientId);
  for (const f of files.slice(KEEP)) await api(clientId, `https://www.googleapis.com/drive/v3/files/${f.id}`, { method: 'DELETE' }).catch(() => {});
}

export async function driveLatest(clientId: string): Promise<BackupFile | null> {
  const files = await list(clientId);
  if (!files.length) return null;
  const res = await api(clientId, `https://www.googleapis.com/drive/v3/files/${files[0].id}?alt=media`);
  return (await res.json()) as BackupFile;
}
