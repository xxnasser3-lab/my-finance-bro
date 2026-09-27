const P: Record<string, string> = {
  home: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  wallet: 'M4 7.5V18a2 2 0 0 0 2 2h14V9H6a2 2 0 0 1-2-2 2 2 0 0 1 2-2h12M16.5 14.5h.01',
  plus: 'M12 5v14M5 12h14',
  card: 'M2.5 7.5a2 2 0 0 1 2-2h15a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-15a2 2 0 0 1-2-2zM2.5 10h19M6 15h4',
  debt: 'M3 9a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3zM3 10h18M16 15h2',
  plan: 'M4 19V5M4 19h16M8 15l4-4 3 3 5-6',
  reports: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  repeat: 'M17 2l4 4-4 4M3 11v-1a4 4 0 0 1 4-4h14M7 22l-4-4 4-4M21 13v1a4 4 0 0 1-4 4H3',
  plane: 'M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z',
  grid: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM17.5 14v7M14 17.5h7',
  list: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  settings: 'M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6',
  eye: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
  eyeOff: 'M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.2M6.6 6.6A17 17 0 0 0 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2',
  back: 'M9 6l6 6-6 6',
  fwd: 'M15 6l-6 6 6 6',
  chevDown: 'M6 9l6 6 6-6',
  x: 'M6 6l12 12M18 6 6 18',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  copy: 'M9 9h12v12H9zM5 15V5a2 2 0 0 1 2-2h10',
  lock: 'M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4',
  alert: 'M12 3 2 20h20zM12 10v4M12 17h.01',
  gift: 'M3 9h18v4H3zM5 13v8h14v-8M12 9v12M12 9C10 5 6 5 6 7.5S9 9 12 9zM12 9c2-4 6-4 6-1.5S15 9 12 9z',
  up: 'M12 19V5M5 12l7-7 7 7',
  down: 'M12 5v14M6 13l6 6 6-6',
  transfer: 'M7 7h13l-4-4M17 17H4l4 4',
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-3.5-3.5',
  edit: 'M4 20h4L19 9l-4-4L4 16z',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14',
  download: 'M12 3v12M7 10l5 5 5-5M4 21h16',
  upload: 'M12 21V9M7 14l5-5 5 5M4 3h16',
  cloud: 'M7 18a5 5 0 0 1-.6-10 6 6 0 0 1 11.6 1.5A4 4 0 0 1 17 18zM12 11v6M9.5 13.5 12 11l2.5 2.5',
  calendar: 'M3 5h18v16H3zM3 10h18M8 3v4M16 3v4',
  bell: 'M6 16v-5a6 6 0 1 1 12 0v5l1.5 2h-15zM10 20.5a2 2 0 0 0 4 0',
  globe: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18',
  key: 'M8 11a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM10.8 12.2 20 3M17 6l3 3M15 8l2 2',
  face: 'M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M9 9v1.5M15 9v1.5M12 9v4h-1M9.5 16c1.5 1 3.5 1 5 0',
  camera: 'M4 8h3l2-3h6l2 3h3v11H4zM12 9.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z',
  bank: 'M3 9 12 4l9 5M5 9v9M9.5 9v9M14.5 9v9M19 9v9M3 20h18',
  cash: 'M2 6h20v12H2zM12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z',
  phone: 'M7 2h10v20H7zM11 18h2',
  food: 'M7 3v6a2 2 0 0 0 4 0V3M9 11v10M17 21V3c-2 1.5-3 4-3 8h3',
  coffee: 'M4 9h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5zM17 11h1.5a2.5 2.5 0 0 1 0 5H17M8 3v3M12 3v3',
  fuel: 'M5 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16M4 21h12M8 7h4M15 9h2a2 2 0 0 1 2 2v5a1.5 1.5 0 0 0 3 0V8l-3-3',
  cart: 'M2 3h3l2.5 12h11.5l2-8H6.5M9 20h.01M18 20h.01',
  bag: 'M6 7h12l1 14H5zM9 7a3 3 0 0 1 6 0',
  heart: 'M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z',
  game: 'M3 7h18v12H3zM8 11v4M6 13h4M15.5 12h.01M17.5 14h.01',
  bolt: 'M13 2 4 14h7l-1 8 9-12h-7z',
  tool: 'M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z',
  book: 'M4 4h11a3 3 0 0 1 3 3v13H7a3 3 0 0 1-3-3zM18 20H7',
  kid: 'M12 4a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM6 21v-2a6 6 0 0 1 12 0v2',
  star: 'M12 3l2.8 5.8 6.2.9-4.5 4.4 1 6.2L12 17.4 6.5 20.3l1-6.2L3 9.7l6.2-.9z',
  tag: 'M20 12l-8 8-9-9V3h8zM7 7h.01',
  people: 'M9 7.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zM2.5 20a6.5 6.5 0 0 1 13 0M17 9.5a2.5 2.5 0 1 0 0 5M16 14.5a5 5 0 0 1 5.5 5',
  dots: 'M6 12h.01M12 12h.01M18 12h.01',
  hands: 'M7 11V6a1.5 1.5 0 0 1 3 0v4M10 10V4.5a1.5 1.5 0 0 1 3 0V10M13 10V6a1.5 1.5 0 0 1 3 0v6c0 5-3 8-7 8s-6-3-7-6l-1-3a1.5 1.5 0 0 1 2.7-1.3L7 13',
  device: 'M4 5h16v11H4zM2 19h20',
  undo: 'M9 14 4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3',
  car: 'M3 16v-4l2-5h14l2 5v4zM3 16v3h3v-3M18 16v3h3v-3M7 13h.01M17 13h.01',
  shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z',
  compass: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM15.5 8.5l-2.1 4.9-4.9 2.1 2.1-4.9z',
  target: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10zM12 11a1 1 0 1 0 0 2 1 1 0 0 0 0-2z',
  wish: 'M12 3l1.8 4.7 4.7 1.8-4.7 1.8L12 16l-1.8-4.7-4.7-1.8 4.7-1.8zM19 15l.8 2.2 2.2.8-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z',
  trend: 'M3 17l6-6 4 4 8-8M15 7h6v6',
  sun: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  moon: 'M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z',
  palette: 'M12 3a9 9 0 0 0 0 18c1.1 0 1.7-.9 1.4-1.9-.4-1.2.5-2.1 1.6-2.1H17a4 4 0 0 0 4-4c0-5.5-4-10-9-10zM7.5 11h.01M10 7h.01M14.5 7h.01M17 11h.01',
  percent: 'M19 5 5 19M6.5 4a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM17.5 15a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z',
  info: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 11v5M12 8h.01',
  forecast: 'M3 5h18v16H3zM3 10h18M8 3v4M16 3v4M7 17l3-3 2 2 4-4'
};

export const ICONS = Object.keys(P);
export const CAT_ICONS = ['food', 'coffee', 'cart', 'fuel', 'car', 'bag', 'device', 'game', 'heart', 'star', 'gift', 'hands', 'home', 'bolt', 'repeat', 'book', 'kid', 'plane', 'tool', 'phone', 'people', 'tag', 'cash', 'card', 'bank', 'up', 'undo', 'dots'];

export function Icon({ name, size = 20, stroke = 1.8, class: cls, style }: { name: string; size?: number; stroke?: number; class?: string; style?: string | Record<string, string> }) {
  return (
    <svg class={cls} style={style} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width={stroke} stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d={P[name] ?? P.dots} />
    </svg>
  );
}

/** Arrow that points "forward" in the current reading direction. */
export function Chev({ dir, size = 18 }: { dir: 'back' | 'fwd' | 'down'; size?: number }) {
  const rtl = document.documentElement.dir === 'rtl';
  const name = dir === 'down' ? 'chevDown' : (dir === 'back') === rtl ? 'back' : 'fwd';
  return <Icon name={name} size={size} stroke={2} class={dir === 'down' ? 'chev' : undefined} />;
}
