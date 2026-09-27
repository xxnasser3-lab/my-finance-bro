import { readBackup, type BackupFile } from '../store/crypto';
import { adoptBackup, backupFile } from '../store/vault';
import { getData, setData, update, flushSave } from '../store/store';
import type { AppData } from '../store/types';
import { driveLatest, driveUpload } from './drive';

function stamp(): string {
  return new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
}

/** Encrypted backup: opens the share sheet on phones (save to Files / iCloud), downloads elsewhere. */
export async function exportBackup(): Promise<void> {
  const file = await backupFile(getData());
  const name = `finance-backup-${stamp()}.json`;
  const blob = new Blob([JSON.stringify(file)], { type: 'application/json' });
  const f = new File([blob], name, { type: 'application/json' });
  const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
  if (nav.canShare?.({ files: [f] })) {
    try {
      await navigator.share({ files: [f], title: name });
      markBackup();
      return;
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
    }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  markBackup();
}

function markBackup(drive = false): void {
  const now = new Date().toISOString();
  update((d) => ({ ...d, settings: { ...d.settings, lastBackupAt: now, ...(drive ? { lastDriveBackupAt: now } : {}) } }));
}

export async function parseBackupFile(file: File): Promise<BackupFile> {
  const parsed = JSON.parse(await file.text()) as BackupFile;
  if (parsed.app !== 'my-finance-bro') throw new Error('not-a-backup');
  return parsed;
}

/** Decrypt a backup with its password and make it the current data (and vault password). */
export async function restoreBackup(file: BackupFile, password: string): Promise<AppData> {
  const data = await readBackup<AppData>(file, password);
  await adoptBackup(file, password, data);
  setData(data);
  await flushSave();
  return data;
}

export async function driveBackup(): Promise<void> {
  const id = getData().settings.driveClientId;
  if (!id) throw new Error('no-client');
  await driveUpload(id, await backupFile(getData()));
  markBackup(true);
}

export async function driveFetchLatest(clientId: string): Promise<BackupFile | null> {
  return driveLatest(clientId);
}

export function downloadText(name: string, text: string, type = 'text/csv'): void {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  a.click();
}
