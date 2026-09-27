import { useEffect, useState } from 'preact/hooks';
import type { AppData, ID } from './types';
import { saveVault } from './vault';

type Listener = () => void;

let data: AppData | null = null;
const listeners = new Set<Listener>();
let saveTimer: number | undefined;
let savePromise: Promise<void> = Promise.resolve();

export function uid(): ID {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function getData(): AppData {
  if (!data) throw new Error('locked');
  return data;
}

export function hasData(): boolean {
  return !!data;
}

export function setData(next: AppData | null, persist = false): void {
  data = next;
  listeners.forEach((l) => l());
  if (persist && next) scheduleSave();
}

/** Apply an immutable update and persist it (encrypted) shortly after. */
export function update(fn: (d: AppData) => AppData): void {
  if (!data) return;
  data = fn(data);
  listeners.forEach((l) => l());
  scheduleSave();
}

function scheduleSave(): void {
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    const snapshot = data;
    if (snapshot) savePromise = savePromise.then(() => saveVault(snapshot)).catch((e) => console.error('save failed', e));
  }, 250);
}

export async function flushSave(): Promise<void> {
  window.clearTimeout(saveTimer);
  if (data) await saveVault(data);
  await savePromise;
}

export function useData(): AppData {
  const [, force] = useState(0);
  useEffect(() => {
    const l = () => force((n) => n + 1);
    listeners.add(l);
    return () => listeners.delete(l);
  }, []);
  return getData();
}

// ---- small immutable helpers ----
export function upsert<T extends { id: ID }>(list: T[], item: T): T[] {
  const i = list.findIndex((x) => x.id === item.id);
  if (i === -1) return [...list, item];
  const copy = list.slice();
  copy[i] = item;
  return copy;
}

export function removeById<T extends { id: ID }>(list: T[], id: ID): T[] {
  return list.filter((x) => x.id !== id);
}
