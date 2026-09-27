// Local-date helpers. Dates are stored as YYYY-MM-DD strings in the user's local time.

export function pad(n: number): string {
  return n < 10 ? '0' + n : String(n);
}

export function toISO(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseISO(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function today(): string {
  return toISO(new Date());
}

export function nowTime(): string {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function addDays(s: string, n: number): string {
  const d = parseISO(s);
  d.setDate(d.getDate() + n);
  return toISO(d);
}

export function daysInMonth(y: number, m0: number): number {
  return new Date(y, m0 + 1, 0).getDate();
}

/** Date in month (y, m0) at `day`, clamped to the month length. */
export function clampDay(y: number, m0: number, day: number): string {
  return toISO(new Date(y, m0, Math.min(day, daysInMonth(y, m0))));
}

export function addMonths(s: string, n: number, keepDay?: number): string {
  const d = parseISO(s);
  const y = d.getFullYear();
  const m = d.getMonth() + n;
  const target = new Date(y, m, 1);
  return clampDay(target.getFullYear(), target.getMonth(), keepDay ?? d.getDate());
}

export function diffDays(a: string, b: string): number {
  return Math.round((parseISO(b).getTime() - parseISO(a).getTime()) / 86400000);
}

export function monthKey(s: string): string {
  return s.slice(0, 7);
}

export interface Cycle {
  start: string;
  end: string;
  next: string;
  days: number;
  dayIndex: number;
  daysLeft: number;
}

/** The salary cycle containing `on`: from payday to the day before the next payday. */
export function salaryCycle(payday: number, on: string = today()): Cycle {
  const d = parseISO(on);
  const y = d.getFullYear();
  const m = d.getMonth();
  const thisPay = clampDay(y, m, payday);
  const start = on >= thisPay ? thisPay : clampDay(new Date(y, m - 1, 1).getFullYear(), new Date(y, m - 1, 1).getMonth(), payday);
  const sd = parseISO(start);
  const nm = new Date(sd.getFullYear(), sd.getMonth() + 1, 1);
  const next = clampDay(nm.getFullYear(), nm.getMonth(), payday);
  const end = addDays(next, -1);
  const days = diffDays(start, next);
  const dayIndex = diffDays(start, on);
  return { start, end, next, days, dayIndex, daysLeft: days - dayIndex };
}

/** Week (Sunday–Saturday) containing `on`. */
export function weekRange(on: string): { start: string; end: string } {
  const d = parseISO(on);
  const start = addDays(on, -d.getDay());
  return { start, end: addDays(start, 6) };
}

export function monthRange(y: number, m0: number): { start: string; end: string } {
  return { start: clampDay(y, m0, 1), end: clampDay(y, m0, 31) };
}

export function inRange(s: string, start: string, end: string): boolean {
  return s >= start && s <= end;
}
