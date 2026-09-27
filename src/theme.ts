// Color theme and light/dark mode. The choice lives in the encrypted settings, and a
// copy is kept in localStorage so the lock screen looks the same before unlocking.
export type ThemeName = 'ember' | 'oasis' | 'sea' | 'night';
export type ThemeMode = 'dark' | 'light' | 'auto';

export const THEMES: ThemeName[] = ['ember', 'oasis', 'sea', 'night'];
/** accent, dark surface, light surface — for the picker's preview swatches */
export const SWATCH: Record<ThemeName, [string, string, string]> = {
  ember: ['#dd6220', '#16110e', '#fffcf8'],
  oasis: ['#14a38b', '#0f1614', '#fcfefd'],
  sea: ['#3e7bfa', '#0f131b', '#fdfeff'],
  night: ['#8b6cf0', '#13111b', '#fefdff']
};

const light = window.matchMedia?.('(prefers-color-scheme: light)');

function syncMeta(mode: ThemeMode): void {
  const root = document.documentElement;
  const bg = getComputedStyle(root).getPropertyValue('--bg').trim();
  const set = (name: string, content: string) => {
    let m = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
    if (!m) {
      m = document.createElement('meta');
      m.name = name;
      document.head.appendChild(m);
    }
    m.content = content;
  };
  if (bg) set('theme-color', bg);
  set('color-scheme', mode === 'auto' ? 'light dark' : mode);
}

export function applyTheme(theme: ThemeName = 'ember', mode: ThemeMode = 'dark'): void {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.dataset.mode = mode;
  syncMeta(mode);
  try {
    localStorage.setItem('theme', theme);
    localStorage.setItem('mode', mode);
  } catch {
    /* private mode */
  }
}

export function applySavedTheme(): void {
  let theme: ThemeName = 'ember';
  let mode: ThemeMode = 'dark';
  try {
    const t = localStorage.getItem('theme') as ThemeName | null;
    const m = localStorage.getItem('mode') as ThemeMode | null;
    if (t && THEMES.includes(t)) theme = t;
    if (m === 'dark' || m === 'light' || m === 'auto') mode = m;
  } catch {
    /* private mode */
  }
  applyTheme(theme, mode);
}

light?.addEventListener?.('change', () => {
  if (document.documentElement.dataset.mode === 'auto') syncMeta('auto');
});
