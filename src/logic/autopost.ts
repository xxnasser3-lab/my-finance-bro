// Daily fixed expenses (e.g. cigarettes, morning coffee) log themselves once a day.
import type { AppData, Tx } from '../store/types';
import { addDays, parseISO, today } from './dates';

const MAX_CATCH_UP = 45;

/** Returns updated data when something was logged, otherwise null. */
export function autoPost(d: AppData, now = today()): AppData | null {
  let changed = false;
  const txs: Tx[] = [];
  const commitments = d.commitments.map((c) => {
    if (c.kind !== 'daily' || !c.active || c.auto === false) return c;
    if (c.lastPosted && c.lastPosted >= now) return c;
    let from = c.lastPosted ? addDays(c.lastPosted, 1) : now;
    const earliest = addDays(now, -MAX_CATCH_UP);
    if (from < earliest) from = earliest;
    for (let day = from; day <= now; day = addDays(day, 1)) {
      const wd = parseISO(day).getDay();
      if (c.weekdays && c.weekdays.length && !c.weekdays.includes(wd)) continue;
      txs.push({
        id: 'auto-' + c.id + '-' + day,
        type: 'expense',
        amount: c.amount,
        date: day,
        time: '09:00',
        categoryId: c.categoryId ?? 'c-daily',
        accountId: c.accountId,
        commitmentId: c.id,
        note: c.name,
        auto: true,
        createdAt: new Date().toISOString()
      });
    }
    changed = true;
    return { ...c, lastPosted: now };
  });
  if (!changed) return null;
  const existing = new Set(d.txs.map((x) => x.id));
  return { ...d, commitments, txs: [...d.txs, ...txs.filter((x) => !existing.has(x.id))] };
}
