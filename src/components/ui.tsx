import type { ComponentChildren } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { t, getLang, type Key } from '../i18n';
import { catKeysAr, catKeysEn } from '../store/seed';
import { getData } from '../store/store';
import type { Category } from '../store/types';
import { goBack } from '../router';
import { Chev, Icon } from './Icon';

// ---------- money ----------
export function fmt(n: number, decimals = 0): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export function fmtSigned(n: number): string {
  return (n < 0 ? '−' : '') + fmt(Math.abs(n));
}

/** Number wrapped in a left-to-right isolate so its sign stays in front inside Arabic text. */
export function num(n: number): string {
  return '\u2066' + fmtSigned(n) + '\u2069';
}

export function Money({ v, decimals = 0, class: cls, signed, hideable = true }: { v: number; decimals?: number; class?: string; signed?: boolean; hideable?: boolean }) {
  const hide = hideable && getData().settings.hideAmounts;
  const text = hide ? '••••' : (signed ? (v > 0 ? '+' : v < 0 ? '−' : '') : v < 0 ? '−' : '') + fmt(Math.abs(v), decimals);
  return <span dir="ltr" class={'n ' + (cls ?? '')}>{text}</span>;
}

export function catName(c?: Category): string {
  if (!c) return t('none');
  if (c.key) return (getLang() === 'ar' ? catKeysAr : catKeysEn)[c.key] ?? c.name;
  return c.name;
}

export function hexA(hex: string, a: number): string {
  const h = hex.replace('#', '');
  return `rgba(${parseInt(h.slice(0, 2), 16)},${parseInt(h.slice(2, 4), 16)},${parseInt(h.slice(4, 6), 16)},${a})`;
}

// ---------- toast ----------
let toastSet: ((s: string) => void) | null = null;
export function toast(msg: string): void {
  toastSet?.(msg);
}
export function ToastHost() {
  const [msg, setMsg] = useState('');
  useEffect(() => {
    let timer: number | undefined;
    toastSet = (s) => {
      setMsg(s);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setMsg(''), 2200);
    };
    return () => (toastSet = null);
  }, []);
  return msg ? <div class="toast" role="status">{msg}</div> : null;
}

export async function copyText(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    toast(t('copied'));
    window.setTimeout(() => navigator.clipboard.writeText('').catch(() => {}), 30000);
  } catch {
    toast(text);
  }
}

// ---------- layout ----------
export function TopBar({ title, back, children, fallback = '/' }: { title?: ComponentChildren; back?: boolean; children?: ComponentChildren; fallback?: string }) {
  return (
    <div class="topbar">
      {back && (
        <button class="icon-btn" aria-label={t('back')} onClick={() => goBack(fallback)}>
          <Chev dir="back" />
        </button>
      )}
      <h1>{title}</h1>
      {children}
    </div>
  );
}

export function Sheet({ onClose, children, title }: { onClose: () => void; children: ComponentChildren; title?: string }) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, []);
  return (
    <div class="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div class="sheet" role="dialog" aria-modal="true">
        <div class="handle" />
        {title && (
          <div class="between">
            <h2>{title}</h2>
            <button class="icon-btn" aria-label={t('close')} onClick={onClose} style="width:36px;height:36px">
              <Icon name="x" size={16} stroke={2} />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

export function Collapse({ title, right, open, children, class: cls }: { title: ComponentChildren; right?: ComponentChildren; open?: boolean; children: ComponentChildren; class?: string }) {
  return (
    <details class={'card pad-x ' + (cls ?? '')} open={open}>
      <summary>
        <span class="sum-title">{title}</span>
        {right}
        <Chev dir="down" />
      </summary>
      {children}
    </details>
  );
}

export function Field({ label, children, hint }: { label: string; children: ComponentChildren; hint?: string }) {
  return (
    <label class="field">
      {label}
      {children}
      {hint && <span class="xs faint">{hint}</span>}
    </label>
  );
}

export function NumInput({ value, onInput, placeholder, step = 'any' }: { value: number | undefined; onInput: (v: number) => void; placeholder?: string; step?: string }) {
  return (
    <input
      class="input num"
      type="number"
      inputMode="decimal"
      step={step}
      placeholder={placeholder}
      value={value === undefined || Number.isNaN(value) ? '' : value}
      onInput={(e) => onInput(parseFloat((e.target as HTMLInputElement).value))}
    />
  );
}

export function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return <button type="button" role="switch" aria-checked={on} aria-label={label} class={'switch' + (on ? ' on' : '')} onClick={() => onChange(!on)} />;
}

export function Seg<T extends string>({ value, options, onChange }: { value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div class="seg" role="tablist">
      {options.map(([v, label]) => (
        <button type="button" role="tab" aria-selected={v === value} class={v === value ? 'on' : ''} onClick={() => onChange(v)}>
          {label}
        </button>
      ))}
    </div>
  );
}

export function Stepper({ value, min, max, onChange }: { value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <div class="stepper">
      <button type="button" aria-label="-" onClick={() => onChange(value <= min ? max : value - 1)}>−</button>
      <span>{value}</span>
      <button type="button" aria-label="+" onClick={() => onChange(value >= max ? min : value + 1)}>+</button>
    </div>
  );
}

export function Empty({ k = 'empty' }: { k?: Key }) {
  return <div class="empty">{t(k)}</div>;
}

export function Bar({ pct, color, tall }: { pct: number; color?: string; tall?: boolean }) {
  return (
    <div class={'bar' + (tall ? ' tall' : '')}>
      <div style={{ width: Math.max(0, Math.min(100, pct)) + '%', background: color }} />
    </div>
  );
}

export function CatBadge({ c, size = 38 }: { c?: Category; size?: number }) {
  const color = c?.color ?? '#8C7564';
  return (
    <span class="ib" style={{ width: size + 'px', height: size + 'px', background: hexA(color, 0.14), borderColor: 'transparent', color }}>
      <Icon name={c?.icon ?? 'dots'} size={Math.round(size * 0.47)} />
    </span>
  );
}

export function confirmDo(msg: string): boolean {
  return window.confirm(msg);
}
