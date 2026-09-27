import { useEffect, useState } from 'preact/hooks';

let depth = 0;

export function currentPath(): string {
  return location.hash.replace(/^#/, '') || '/';
}

export function navigate(path: string, replace = false): void {
  const url = '#' + path;
  if (replace) history.replaceState(null, '', url);
  else {
    history.pushState(null, '', url);
    depth++;
  }
  window.dispatchEvent(new Event('hashchange'));
  window.scrollTo(0, 0);
}

/** Go back inside the app, or to `fallback` when there is no in-app history. */
export function goBack(fallback = '/'): void {
  if (depth > 0) history.back();
  else navigate(fallback, true);
}

window.addEventListener('popstate', () => {
  depth = Math.max(0, depth - 1);
});

export function useRoute(): string[] {
  const [path, setPath] = useState(currentPath());
  useEffect(() => {
    const on = () => setPath(currentPath());
    window.addEventListener('hashchange', on);
    window.addEventListener('popstate', on);
    return () => {
      window.removeEventListener('hashchange', on);
      window.removeEventListener('popstate', on);
    };
  }, []);
  return path.split('/').filter(Boolean);
}
